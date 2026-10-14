#!/usr/bin/env python3
"""
Uplift - Raspberry Pi Zero 2 W heart rate Bluetooth peripheral (Demo 1)

Advertises the standard Bluetooth Heart Rate Service (0x180D) and sends BPM on
the Heart Rate Measurement characteristic (0x2A37) once per second.
The Uplift app connects to this with its "Connect sensor" button.

Setup on the Pi (one time):
    sudo apt update
    sudo apt install -y python3-pip bluez python3-dbus python3-gi
    pip3 install bluezero --break-system-packages

Run:
    sudo python3 uplift_hr_pi.py

Right now read_bpm() sends fake data so you can test the app today.
Replace it with your real sensor code when the hardware is wired up.
"""

import random
from bluezero import adapter, peripheral, async_tools

HR_SERVICE = "180D"
HR_MEASUREMENT = "2A37"
SEND_EVERY_SECONDS = 1

_fake_bpm = 72.0


def read_bpm():
    """Return the current heart rate as an int, or None if there's no signal.

    TODO: replace this with your real sensor reading.
    """
    global _fake_bpm
    _fake_bpm += random.uniform(-3, 3)
    _fake_bpm = max(60, min(110, _fake_bpm))
    return int(_fake_bpm)


def send_reading(characteristic):
    bpm = read_bpm()
    if bpm is not None and 0 < bpm < 256:
        # byte 0 = flags (0 means "BPM is one byte"), byte 1 = BPM
        characteristic.set_value([0x00, bpm])
        print(f"Sent {bpm} BPM")
    # keep the timer going only while the app is listening
    return characteristic.is_notifying


def on_notify_change(notifying, characteristic):
    if notifying:
        print("App connected, sending readings")
        async_tools.add_timer_seconds(SEND_EVERY_SECONDS, send_reading, characteristic)
    else:
        print("App stopped listening")


def main():
    pi_adapter = list(adapter.Adapter.available())[0]
    pi_adapter.powered = True

    hr = peripheral.Peripheral(
        pi_adapter.address,
        local_name="Uplift HR",
        appearance=0x0340,  # generic heart rate sensor
    )
    hr.add_service(srv_id=1, uuid=HR_SERVICE, primary=True)
    hr.add_characteristic(
        srv_id=1,
        chr_id=1,
        uuid=HR_MEASUREMENT,
        value=[],
        notifying=False,
        flags=["notify"],
        notify_callback=on_notify_change,
    )
    print("Advertising as 'Uplift HR'. Open the app and tap Connect sensor.")
    hr.publish()


if __name__ == "__main__":
    main()
