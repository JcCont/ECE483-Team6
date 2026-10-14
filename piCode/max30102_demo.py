import time
import smbus2
#Demo code for MAX30102 Pulse Oximeter and Heart Rate Sensor
#Will be changed and improved in the future, but for now it is a simple demo to show how to use the sensor.

# MAX30102 I2C Address
MAX30102_ADDR = 0x57  # 7-bit address corresponding to 0xAE/0xAF[cite: 5, 29]

# Register Addresses[cite: 10, 11]
REG_INTR_STATUS_1 = 0x00
REG_INTR_STATUS_2 = 0x01
REG_INTR_ENABLE_1 = 0x02
REG_INTR_ENABLE_2 = 0x03
REG_FIFO_WR_PTR   = 0x04
REG_OVF_COUNTER   = 0x05
REG_FIFO_RD_PTR   = 0x06
REG_FIFO_DATA     = 0x07
REG_FIFO_CONFIG   = 0x08
REG_MODE_CONFIG   = 0x09
REG_SPO2_CONFIG   = 0x0A
REG_LED1_PA       = 0x0C  # RED LED
REG_LED2_PA       = 0x0D  # IR LED
REG_PART_ID       = 0xFF  # Expected value: 0x15[cite: 11]

class MAX30102:
    def __init__(self, bus_number=1):
        self.bus = smbus2.SMBus(bus_number)
        self.verify_part_id()
        self.reset()
        self.setup()

    def verify_part_id(self):
        part_id = self.bus.read_byte_data(MAX30102_ADDR, REG_PART_ID)
        if part_id != 0x15:
            raise RuntimeError(f"Unexpected Part ID: 0x{part_id:02X} (Expected 0x15)")[cite: 11]
        print("MAX30102 detected successfully.")

    def reset(self):
        # Trigger software reset (Bit 6 of REG_MODE_CONFIG)[cite: 18]
        self.bus.write_byte_data(MAX30102_ADDR, REG_MODE_CONFIG, 0x40)
        time.sleep(0.1)

    def setup(self):
        # FIFO Config: Sample Averaging = 4, FIFO Rollover enabled, Almost Full = 17 samples[cite: 17]
        # SMP_AVE = 010 (4 samples), FIFO_ROLLOVER_EN = 1, FIFO_A_FULL = 0xF[cite: 17]
        self.bus.write_byte_data(MAX30102_ADDR, REG_FIFO_CONFIG, 0x5F)

        # SpO2 Config: ADC Range = 4096nA, Sample Rate = 100 Hz, Pulse Width = 411us (18-bit ADC)[cite: 18, 19]
        # SPO2_ADC_RGE = 01 (4096nA), SPO2_SR = 001 (100 Hz), LED_PW = 11 (411us / 18-bit)[cite: 18, 19]
        self.bus.write_byte_data(MAX30102_ADDR, REG_SPO2_CONFIG, 0x27)

        # LED Pulse Amplitude: ~7.2mA for RED (LED1) and IR (LED2)[cite: 20]
        self.bus.write_byte_data(MAX30102_ADDR, REG_LED1_PA, 0x24)
        self.bus.write_byte_data(MAX30102_ADDR, REG_LED2_PA, 0x24)

        # Mode Config: SpO2 Mode (Red + IR enabled)[cite: 18]
        # MODE[2:0] = 011[cite: 18]
        self.bus.write_byte_data(MAX30102_ADDR, REG_MODE_CONFIG, 0x03)

        # Clear FIFO pointers[cite: 13, 15]
        self.bus.write_byte_data(MAX30102_ADDR, REG_FIFO_WR_PTR, 0x00)
        self.bus.write_byte_data(MAX30102_ADDR, REG_OVF_COUNTER, 0x00)
        self.bus.write_byte_data(MAX30102_ADDR, REG_FIFO_RD_PTR, 0x00)

    def read_fifo(self):
        """Reads all available samples from the FIFO."""
        wr_ptr = self.bus.read_byte_data(MAX30102_ADDR, REG_FIFO_WR_PTR)
        rd_ptr = self.bus.read_byte_data(MAX30102_ADDR, REG_FIFO_RD_PTR)

        if wr_ptr == rd_ptr:
            return []

        # Calculate number of available samples taking pointer wrap-around into account[cite: 16]
        num_samples = (wr_ptr - rd_ptr) % 32
        samples = []

        for _ in range(num_samples):
            # Read 6 bytes per sample (3 bytes Red, 3 bytes IR)[cite: 14, 15]
            raw_data = self.bus.read_i2c_block_data(MAX30102_ADDR, REG_FIFO_DATA, 6)
            
            # Unpack 18-bit Left-Justified ADC values[cite: 14, 15]
            red_raw = ((raw_data[0] << 16) | (raw_data[1] << 8) | raw_data[2]) & 0x03FFFF[cite: 14, 15]
            ir_raw  = ((raw_data[3] << 16) | (raw_data[4] << 8) | raw_data[5]) & 0x03FFFF[cite: 14, 15]

            samples.append((red_raw, ir_raw))

        return samples

    def read_temperature(self):
        """Initiates and reads internal die temperature in Celsius."""
        self.bus.write_byte_data(MAX30102_ADDR, 0x21, 0x01)  # Enable TEMP_EN[cite: 22]
        time.sleep(0.03)  # Wait 29ms for conversion[cite: 4, 26]
        
        t_int = self.bus.read_byte_data(MAX30102_ADDR, 0x1F)[cite: 22]
        t_frac = self.bus.read_byte_data(MAX30102_ADDR, 0x20)[cite: 22]
        
        # Convert 2's complement integer part[cite: 22]
        if t_int > 127:
            t_int -= 256
            
        return t_int + (t_frac * 0.0625)[cite: 22]

if __name__ == "__main__":
    sensor = MAX30102()
    print("Reading bio-sensor data... Press Ctrl+C to stop.")
    
    try:
        temp = sensor.read_temperature()
        print(f"Die Temperature: {temp:.2f} °C\n")
        
        while True:
            samples = sensor.read_fifo()
            for red, ir in samples:
                print(f"RED: {red:6d} | IR: {ir:6d}")
            time.sleep(0.05)
            
    except KeyboardInterrupt:
        print("\nDemo stopped.")