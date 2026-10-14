#sample script, must have bleak installed, run with python3 bluetooth_test.py
import asyncio
from bleak import BleakScanner, BleakClient

# Common 16-bit UUID for Battery Level (standardized by Bluetooth SIG)
BATTERY_CHAR_UUID = "00002a19-0000-1000-8000-00805f9b34fb"

async def main():
    print("Scanning for BLE devices...")
    devices = await BleakScanner.discover()
    for d in devices:
        print(f"Found: {d.name} [{d.address}]")
        
    # Replace with your targeted device's address/UUID
    target_address = "XX:XX:XX:XX:XX:XX" 
    
    print(f"Connecting to {target_address}...")
    async with BleakClient(target_address) as client:
        if client.is_connected:
            print("Connected successfully!")
            
            # Read data from a characteristic
            battery_level = await client.read_gatt_char(BATTERY_CHAR_UUID)
            print(f"Battery Level: {int(battery_level[0])}%")
        else:
            print("Failed to connect.")

asyncio.run(main())
