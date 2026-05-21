# Smarthon-SmartGarden-kit
A PXT library for Smarthon Smart Garden AIoT Farmer kit


# About Smarthon Smart Garden AIoT Farmer Kit
Smarthon Smart Garden AIoT Farmer Kit is designed to introduce the fundamentals of the Internet of Things (IoT) with a focus on plant care and environmental monitoring. This kit provides a comprehensive set of sensors and actuators tailored to study and optimize plant growth conditions. Using Smarthon IoT boards compatible with BBC micro:bit, users can explore real-world applications by creating intelligent systems such as automatic irrigation, lighting control and environmental monitoring. This kit empowers learners not only to become responsible caretakers of plants but also to develop skills in computer science, electronics and IoT development through engaging and practical projects.

More product information at [https://smarthon.cc/micro-bit-smart-garden-kit/](https://smarthon.cc/micro-bit-smart-garden-kit/)

You may check the Read the Docs about Smarthon IoT:bit here:[https://smarthon-docs-en.readthedocs.io/en/latest/smartgarden/index.html](https://smarthon-docs-en.readthedocs.io/en/latest/smartgarden/index.html)

## Component List
* Smarthon iot:bit
* LCD Screen
* LED grow light
* Fog module
* Water pump
* Soil moisture senson
* Digital light sensor
* Temperature and huidity sensor
* Module wire
* Extension wire
* Screws (6)M3x14mm (10)M4x10mm
* Scres nuts
* Screwdriver
* Blu tack
* Wooden stick
* Soil
* Seed
* Fog accessories
* Pump tube
* Humidifier cup
* Pump cup
* Pot tray
* USB cable
* Battery holder
* Acrylic module
* Plastic mat

## Example Tutorial

### 1. Read and get the value of temperature and humidity
The DHT11 sensor will return the temperature and humidity in environment, and save in the variable<P>
Before showing or using the variable, need to be read the DHT11 sensor<P>
  <B>For Temperature</B><BR>
Maxmium:50 Celsius degree<BR>
Minmium:0 Celsius degree<P>
  <B>For Humidity</B><BR>
Maxmium:80%<BR>
Minmium:20%<BR>

```block
House.readDHT11(DigitalPin.P0)
basic.showNumber(House.readTemperatureData(House.Temp_degree.degree_Celsius))
basic.showNumber(House.readHumidityData())
```
### 2. Control the 180 degree servo motor
Input the value to let the 180 degree servo motor move to specific position<P>
Maxmium:180<BR>
Minmium:0<BR>


```block
input.onButtonPressed(Button.A, function () {
    House.Turn180Servo(180, AnalogPin.P0)
})
```
### 3. Action when the Button pressed

The function in the block will be execute after the button (connected to pin) pressed<P>


```block
House.Button(House.PressButtonList.b0, function () {
    basic.showString("Pressed!")
})
```

## License

MIT

## Supported targets

* for PXT/microbit

(The metadata above is needed for package search.)

