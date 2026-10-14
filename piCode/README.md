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