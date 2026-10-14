10/13/2026

Max30102_demo will hold the current code we will use for demo one. It is giving use test values for our sensor. 

To intialize the senors prior to running code:
1. sudo raspi-config
2. sudo apt install -y i2c-tools python3-smbus python3-pip
3. i2cdetect -y 1 (verifies chip communication should show 57)
Now we can run demo code

Data sheets for all sensors and PI will also live in this part of the repo for quick check and access to all information need. 

I plan on making a pdf documenting how to do all of this once full set up.

10/14/2026

Sensor up and running, demo could shows the values that the sensor is able to work and gives off RED and IR values constantly
These values are going to be used to determine heart beat and oxygen as the next poriton for the demo. 
After we are able to determine all that the last part will be to send data through bluetooth. 
A pdf of the summary of how demo for the sensor was 

(12:37pm):
New python script that continously checking for heart rate and oxygen
The max30102_heartrate_spo2.py script converts raw optical readings into continuous health metrics using a 5-stage pipeline:

1. I2C Ingestion & Buffer Management: Configures the sensor to SpO2 mode at 100 Hz with elevated LED current (12.5 mA). It continuously unpacks 6-byte samples (3 bytes Red, 3 bytes IR) from the sensor's internal FIFO into 3-second sliding window buffers (BUFFER_SIZE = 300).
2. Finger Presence Gating: Checks the average IR light level against a baseline threshold (40,000 counts). If total light reflection falls below this cutoff, algorithm processing halts instantly and reports "No finger detected".
3. Signal Conditioning:

* DC Removal (remove_dc_trend): Subtracts a 25-sample running average from the raw signal. This removes static tissue absorption and baseline wander, isolating the pure pulsatile arterial AC waveform.
* Noise Filtering (smooth_signal): Applies a 5-point moving-average low-pass filter to remove high-frequency noise and skin micro-tremors.

4. Bio-Metric Calculation Engine:

* Heart Rate (BPM): Uses adaptive statistical thresholding (Mean + 0.4 * StdDev) to identify pulse peaks on the IR channel. It enforces interval bounds (35 to 180 BPM) between peaks to reject motion artifacts, measures the average peak-to-peak time interval, and converts it to BPM.
* Blood Oxygen (SpO2): Measures the peak-to-trough AC amplitude relative to the DC baseline for both channels to compute the absorption ratio R = (AC / DC)red / (AC / DC)ir, converting it to oxygen percentage via SpO2 = 110 - 25R.

5. Display Output Smoothing: Passes validated BPM and SpO2 numbers through an Exponential Moving Average (EMA, alpha = 0.3) filter before refreshing the terminal every 0.3 seconds, preventing display numbers from jumping erratically.

Next step connecting to app through bluetooth and sending information 