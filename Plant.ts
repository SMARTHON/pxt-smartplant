/**
 * Custom blocks
 */
//% weight=98 color=#7abb4b icon="\uf06c" block="Smartplant"
namespace Environment {

    // keep track of services
    //let rainMonitorStarted = false;
    //let windMonitorStarted = false;
    let weatherMonitorStarted = false;
    // Keep Track of weather monitoring variables
    //let numRainDumps = 0
    //let numWindTurns = 0
    //let windMPH = 0

    //-------DHT11---------------------------------------------------


    export enum DHT11dataType {
        //% block="temperature"
        temperature,
        //% block="humidity"
        humidity
    }
    let temp = 0
    let temp_pin = 0
    let _temperature: number = -999.0
    let _humidity: number = -999.0
    let _readSuccessful: boolean = false
    let _sensorresponding: boolean = false
    let _firsttime: boolean = true
    let _last_successful_query_temperature: number = 0
    let _last_successful_query_humidity: number = 0


    //% block="Get DHT11 at pin %dataPin|"
    function dht11_queryData(dataPin: DigitalPin) {

        if (_firsttime == true) {
            _firsttime = false
            dht11_queryData(dataPin)
        }
        //initialize
        let startTime: number = 0
        let endTime: number = 0
        let checksum: number = 0
        let checksumTmp: number = 0
        let dataArray: boolean[] = []
        let resultArray: number[] = []
        for (let index = 0; index < 40; index++) dataArray.push(false)
        for (let index = 0; index < 5; index++) resultArray.push(0)
        _humidity = 0
        _temperature = 0
        _readSuccessful = false


        //request data
        pins.digitalWritePin(dataPin, 0) //begin protocol
        basic.pause(18)
        pins.setPull(dataPin, PinPullMode.PullUp) //pull up data pin if needed
        pins.digitalReadPin(dataPin)
        control.waitMicros(40)

        if (pins.digitalReadPin(dataPin) == 1) {
            //if no respone,exit the loop to avoid Infinity loop
            pins.setPull(dataPin, PinPullMode.PullNone) //release pull up
        }
        else {
            pins.setPull(dataPin, PinPullMode.PullNone) //release pull up
            while (pins.digitalReadPin(dataPin) == 0); //sensor response
            while (pins.digitalReadPin(dataPin) == 1); //sensor response

            //read data (5 bytes)
            for (let index = 0; index < 40; index++) {
                startTime = input.runningTimeMicros()
                while (pins.digitalReadPin(dataPin) == 1){
                    endTime = input.runningTimeMicros()
                    if ((endTime - startTime) > 150) { break; }
                };
                while (pins.digitalReadPin(dataPin) == 0){
                    endTime = input.runningTimeMicros()
                    if ((endTime - startTime) > 150) { break; }
                };
                control.waitMicros(28)
                //if sensor pull up data pin for more than 28 us it means 1, otherwise 0
                if (pins.digitalReadPin(dataPin) == 1) dataArray[index] = true
            }

            //convert byte number array to integer
            for (let index = 0; index < 5; index++)
                for (let index2 = 0; index2 < 8; index2++)
                    if (dataArray[8 * index + index2]) resultArray[index] += 2 ** (7 - index2)

            //verify checksum
            checksumTmp = resultArray[0] + resultArray[1] + resultArray[2] + resultArray[3]
            checksum = resultArray[4]
            if (checksumTmp >= 512) checksumTmp -= 512
            if (checksumTmp >= 256) checksumTmp -= 256
            if (checksum == checksumTmp) _readSuccessful = true

            //read data if checksum ok
            if (_readSuccessful) {
                _humidity = resultArray[0] + resultArray[1] / 100
                _temperature = resultArray[2] + resultArray[3] / 100
                _last_successful_query_humidity = _humidity
                _last_successful_query_temperature = _temperature
            } else {
                _humidity = _last_successful_query_humidity
                _temperature = _last_successful_query_temperature
            }
        }
        //wait 1.5 sec after query 
        basic.pause(1500)
    }

    //% block="DHT11 Read %dht11data| at pin %dht11pin|"
    //% weight=90
    export function readData(dht11data: DHT11dataType, dht11pin: DigitalPin): number {
        // querydata
        dht11_queryData(dht11pin)
        //return temperature /humidity
        // if (dht11data == DHT11dataType.temperature && _readSuccessful)
        //     return Math.round(_temperature)
        // else if (dht11data == DHT11dataType.humidity && _readSuccessful)
        //     return Math.round(_humidity)
        // else return 0

        if (dht11data == DHT11dataType.temperature) {
            return Math.round(_temperature)
        }
        else
            return Math.round(_humidity)
    }

    //------DHT11-------------------------------------------------




    //------------------BH1750----------------------------------------------

    let BH1750_I2C_ADDR = 35;
    pins.i2cWriteNumber(BH1750_I2C_ADDR, 0x11, NumberFormat.UInt8BE); //turn on bh1750

    /**
    * get light intensity value from bh1750
    */
    //% blockId="readBH1750" block="value of light intensity(Lx) from BH1750"
    export function getIntensity(): number {
        let raw_value = Math.idiv(pins.i2cReadNumber(BH1750_I2C_ADDR, NumberFormat.UInt16BE) * 5, 6);



        return raw_value;
    }

    //------------------BH1750----------------------------------------------


    /**
     * get soil moisture value (0~100)
     * @param soilmoisturepin describe parameter here, eg: AnalogPin.P1
     */
    //% blockId="readsoilmoisture" block="value of soil moisture(0~100) at pin %soilhumiditypin"
    export function ReadSoilHumidity(soilmoisturepin: AnalogPin): number {
        let voltage = 0;
        let soilmoisture = 0;
        voltage = pins.map(
            pins.analogReadPin(soilmoisturepin),
            0,
            1023,
            0,
            100
        );
        soilmoisture = voltage;
        return Math.round(soilmoisture)
    }

    //% blockId="smarthon_waterpump"
    //% block="Set Water pump to intensity %intensity at %pin"
    //% intensity.min=0 intensity.max=1023
    //% weight=71
    //% advanced=true
    export function TurnWaterpump(intensity: number, pin: AnalogPin): void {

        pins.analogWritePin(pin, intensity);
    }

    //% blockId="smarthon_waterpump_period"
    //% block="Set Water pump to intensity %intensity at %pin for %time sec"
    //% intensity.min=0 intensity.max=1023
    //% weight=70
    //% advanced=true
    export function TurnWaterpump_period(intensity: number, pin: AnalogPin, time:number): void {

        pins.analogWritePin(pin, intensity);
        basic.pause(time*1000);
        pins.analogWritePin(pin, 0);

    }

    //% blockId="smarthon_humdifier"
    //% block="Set Humidifier to intensity %intensity at %pin"
    //% intensity.min=0 intensity.max=1023
    //% weight=72
    //% advanced=true
    export function TurnHumdifier(intensity: number, pin: AnalogPin): void {

        pins.analogWritePin(pin, intensity);
    }

    //% blockId="smarthon_plantservo"
    //% block="Set Servo to degree %degree at %pin"
    //% intensity.min=0 intensity.max=180
    //% weight=89	
    //% advanced=true
    export function TurnServo(intensity: number, pin: AnalogPin): void {

        pins.servoWritePin(pin, intensity)
    }
}