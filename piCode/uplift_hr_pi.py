import time
import math
import threading
from collections import deque
import smbus2

# Bluezero BLE Imports
from bluezero import adapter, peripheral, async_tools

# ==========================================
# 1. MAX30102 SENSOR & ALGORITHM SETUP
# ==========================================
MAX30102_ADDR     = 0x57

REG_FIFO_WR_PTR   = 0x04
REG_OVF_COUNTER   = 0x05
REG_FIFO_RD_PTR   = 0x06
REG_FIFO_DATA     = 0x07
REG_FIFO_CONFIG   = 0x08
REG_MODE_CONFIG   = 0x09
REG_SPO2_CONFIG   = 0x0A
REG_LED1_PA       = 0x0C  # RED LED
REG_LED2_PA       = 0x0D  # IR LED
REG_PART_ID       = 0xFF  # Expected: 0x15

SAMPLE_RATE       = 100   # 100 Hz
BUFFER_SIZE       = 300   # 3-second sliding window
FINGER_THRESHOLD  = 40000 # Minimum raw IR count for finger presence

class MAX30102:
    def __init__(self, bus_number=1):
        self.bus = smbus2.SMBus(bus_number)
        self.verify_part_id()
        self.reset()
        self.setup()

    def verify_part_id(self):
        part_id = self.bus.read_byte_data(MAX30102_ADDR, REG_PART_ID)
        if part_id != 0x15:
            raise RuntimeError(f"Unexpected Part ID: 0x{part_id:02X} (Expected 0x15)")

    def reset(self):
        self.bus.write_byte_data(MAX30102_ADDR, REG_MODE_CONFIG, 0x40)
        time.sleep(0.1)

    def setup(self):
        self.bus.write_byte_data(MAX30102_ADDR, REG_FIFO_CONFIG, 0x5F)
        self.bus.write_byte_data(MAX30102_ADDR, REG_SPO2_CONFIG, 0x27)
        self.bus.write_byte_data(MAX30102_ADDR, REG_LED1_PA, 0x3F)  # ~12.5mA
        self.bus.write_byte_data(MAX30102_ADDR, REG_LED2_PA, 0x3F)
        self.bus.write_byte_data(MAX30102_ADDR, REG_MODE_CONFIG, 0x03)
        self.bus.write_byte_data(MAX30102_ADDR, REG_FIFO_WR_PTR, 0x00)
        self.bus.write_byte_data(MAX30102_ADDR, REG_OVF_COUNTER, 0x00)
        self.bus.write_byte_data(MAX30102_ADDR, REG_FIFO_RD_PTR, 0x00)

    def read_fifo(self):
        wr_ptr = self.bus.read_byte_data(MAX30102_ADDR, REG_FIFO_WR_PTR)
        rd_ptr = self.bus.read_byte_data(MAX30102_ADDR, REG_FIFO_RD_PTR)

        if wr_ptr == rd_ptr:
            return []

        num_samples = (wr_ptr - rd_ptr) % 32
        samples = []

        for _ in range(num_samples):
            raw_data = self.bus.read_i2c_block_data(MAX30102_ADDR, REG_FIFO_DATA, 6)
            red_raw = ((raw_data[0] << 16) | (raw_data[1] << 8) | raw_data[2]) & 0x03FFFF
            ir_raw  = ((raw_data[3] << 16) | (raw_data[4] << 8) | raw_data[5]) & 0x03FFFF
            samples.append((red_raw, ir_raw))

        return samples


def remove_dc_trend(signal_data, window_size=25):
    dc_removed = []
    half_w = window_size // 2
    n = len(signal_data)
    for i in range(n):
        start = max(0, i - half_w)
        end = min(n, i + half_w + 1)
        mean_val = sum(signal_data[start:end]) / (end - start)
        dc_removed.append(signal_data[i] - mean_val)
    return dc_removed


def smooth_signal(signal_data, window_size=5):
    smoothed = []
    half_w = window_size // 2
    n = len(signal_data)
    for i in range(n):
        start = max(0, i - half_w)
        end = min(n, i + half_w + 1)
        smoothed.append(sum(signal_data[start:end]) / (end - start))
    return smoothed


def process_bio_metrics(red_buf, ir_buf):
    red_list = list(red_buf)
    ir_list  = list(ir_buf)

    mean_ir = sum(ir_list) / len(ir_list)
    mean_red = sum(red_list) / len(red_list)

    if mean_ir < FINGER_THRESHOLD:
        return None, None, "No finger detected"

    ac_red = max(red_list) - min(red_list)
    ac_ir  = max(ir_list)  - min(ir_list)

    if ac_ir == 0 or mean_red == 0 or mean_ir == 0:
        return None, None, "Stabilizing..."

    r = (ac_red / mean_red) / (ac_ir / mean_ir)
    spo2 = 110.0 - (25.0 * r)
    spo2 = max(80.0, min(100.0, spo2))

    ir_ac = remove_dc_trend(ir_list, window_size=25)
    ir_filtered = smooth_signal(ir_ac, window_size=5)

    avg_ac = sum(ir_filtered) / len(ir_filtered)
    var_ac = sum((x - avg_ac) ** 2 for x in ir_filtered) / len(ir_filtered)
    std_ac = math.sqrt(var_ac)

    peak_threshold = avg_ac + (0.4 * std_ac)
    min_dist_samples = int(SAMPLE_RATE * (60.0 / 180.0))
    max_dist_samples = int(SAMPLE_RATE * (60.0 / 35.0))

    peaks = []
    for i in range(1, len(ir_filtered) - 1):
        if ir_filtered[i] > ir_filtered[i - 1] and ir_filtered[i] > ir_filtered[i + 1]:
            if ir_filtered[i] > peak_threshold:
                if not peaks or (i - peaks[-1]) >= min_dist_samples:
                    peaks.append(i)

    if len(peaks) < 2:
        return None, round(spo2, 1), "Detecting pulse..."

    intervals = []
    for i in range(1, len(peaks)):
        interval = peaks[i] - peaks[i - 1]
        if min_dist_samples <= interval <= max_dist_samples:
            intervals.append(interval)

    if not intervals:
        return None, round(spo2, 1), "Filtering noise..."

    avg_interval = sum(intervals) / len(intervals)
    raw_bpm = (60.0 * SAMPLE_RATE) / avg_interval

    return round(raw_bpm, 1), round(spo2, 1), "OK"


# Shared global state for BLE transmission
current_bpm = 0
current_spo2 = 0
current_status = "Initializing..."

def sensor_worker():
    """Background thread continuously sampling sensor and updating metrics."""
    global current_bpm, current_spo2, current_status

    sensor = MAX30102()
    red_buffer = deque(maxlen=BUFFER_SIZE)
    ir_buffer  = deque(maxlen=BUFFER_SIZE)

    filtered_bpm = None
    filtered_spo2 = None
    alpha = 0.3
    last_update = time.time()

    while True:
        samples = sensor.read_fifo()
        for red, ir in samples:
            red_buffer.append(red)
            ir_buffer.append(ir)

        if len(ir_buffer) == BUFFER_SIZE and (time.time() - last_update) >= 0.3:
            raw_bpm, raw_spo2, status = process_bio_metrics(red_buffer, ir_buffer)
            last_update = time.time()

            current_status = status

            if status == "OK" and raw_bpm is not None:
                if filtered_bpm is None:
                    filtered_bpm = raw_bpm
                    filtered_spo2 = raw_spo2
                else:
                    filtered_bpm = (alpha * raw_bpm) + ((1 - alpha) * filtered_bpm)
                    filtered_spo2 = (alpha * raw_spo2) + ((1 - alpha) * filtered_spo2)

                current_bpm = int(round(filtered_bpm))
                current_spo2 = int(round(filtered_spo2))
            elif status == "No finger detected":
                filtered_bpm = None
                filtered_spo2 = None
                current_bpm = 0
                current_spo2 = 0

        time.sleep(0.02)


# ==========================================
# 2. BLE BLUEZERO SERVER SETUP
# ==========================================

# Standard Heart Rate Service & Characteristic UUIDs
HR_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb'
HR_CHAR_UUID    = '00002a37-0000-1000-8000-00805f9b34fb'

def read_bpm():
    """Returns Heart Rate in standard 2-byte BLE Heart Rate payload format."""
    bpm_val = max(0, min(255, current_bpm))
    return [0x00, bpm_val]

def update_ble_value(characteristic):
    """Periodic timer callback to notify connected Web App."""
    if characteristic.is_notifying:
        data = read_bpm()
        characteristic.set_value(data)
        print(f"Sent {current_bpm} BPM | SpO2: {current_spo2}% | Status: {current_status}")
        return True
    return False

def hr_notify_callback(notifying, characteristic):
    """Triggered when Chrome Web App enables or disables notifications."""
    if notifying:
        async_tools.add_timer_seconds(1, update_ble_value, characteristic)


if __name__ == '__main__':
    # 1. Start background sensor acquisition thread
    sensor_thread = threading.Thread(target=sensor_worker, daemon=True)
    sensor_thread.start()

    # 2. Automatically resolve local Bluetooth adapter MAC
    adapters = list(adapter.Adapter.available())
    if not adapters:
        raise RuntimeError("No Bluetooth adapter found. Ensure bluetooth service is active.")
    adapter_address = adapters[0].address

    # 3. Create BLE Peripheral using 'local_name'
    uplift_peripheral = peripheral.Peripheral(
        adapter_address,
        local_name='Uplift HR'
    )

    # 4. Add Heart Rate Service
    uplift_peripheral.add_service(
        srv_id=1,
        uuid=HR_SERVICE_UUID,
        primary=True
    )

    # 5. Add Heart Rate Characteristic
    uplift_peripheral.add_characteristic(
        srv_id=1,
        chr_id=1,
        uuid=HR_CHAR_UUID,
        value=[0x00, 0x00],
        notifying=False,
        flags=['notify', 'read'],
        read_callback=read_bpm,
        notify_callback=hr_notify_callback
    )

    print(f"Advertising on adapter [{adapter_address}] as 'Uplift HR'...")
    uplift_peripheral.publish()