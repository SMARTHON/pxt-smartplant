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


    export enum Temp_degree {
        //% block="°C"
        degree_Celsius,
        //% block="°F"
        degree_Fahrenheit
    }
    let _temperature: number = -999.0
    let _humidity: number = -999.0
    let _readSuccessful: boolean = false
    let _sensorresponding: boolean = false
    let _last_successful_query_temperature: number = 0
    let _last_successful_query_humidity: number = 0

    /**
     * Query the temperature and humidity infromation from DHT11 Temperature and Humidity sensor
     */
    //% block="Read Temperature & Humidity Sensor at pin %dataPin|"
    //% blockId="get_dht11_value"
    //% weight=51
    export function dht11_queryData(dataPin: DigitalPin):void {
        //initialize
        let startTime: number = 0
        let endTime: number = 0
        let checksum: number = 0
        let checksumTmp: number = 0
        let dataArray: boolean[] = []
        let resultArray: number[] = []
        for (let index = 0; index < 40; index++) dataArray.push(false)
        for (let index = 0; index < 5; index++) resultArray.push(0)
        _humidity = -999.0
        _temperature = -999.0
        _readSuccessful = false
        pins.digitalWritePin(dataPin, 1)
        control.waitMicros(30)

        //request data
        pins.digitalWritePin(dataPin, 0) //begin protocol
        control.waitMicros(18000)
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
                while (pins.digitalReadPin(dataPin) == 1);
                while (pins.digitalReadPin(dataPin) == 0);
                control.waitMicros(28)
                //if sensor still pull up data pin after 28 us it means 1, otherwise 0
                if (pins.digitalReadPin(dataPin) == 1) dataArray[index] = true
            }

            endTime = input.runningTimeMicros()

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
        basic.pause(2000)
    }

    /**
     * Get the Temperature value (degree in Celsius or Fahrenheit) after queried the Temperature and Humidity sensor
     */

    //% block="Get Temperature |%temp_degree"
    //% weight=74
    export function readTemperatureData(temp_degree: Temp_degree): number {
        // querydata
        if (temp_degree == Temp_degree.degree_Celsius) {
            return Math.round(_last_successful_query_temperature)
        }
        else {
            return Math.round((_last_successful_query_temperature * 1.8) + 32)
        }
    }

    /**
     * Get the humidity value (in percentage) after queried the Temperature and Humidity sensor
     */
    //% block="Get Humidity"
    //% weight=73
    export function readHumidityData(): number {
        // querydata

        return Math.round(_last_successful_query_humidity)


    }

    //-------DHT11---------------------------------------------------

    let BH1750_I2C_ADDR = 35;
    pins.i2cWriteNumber(BH1750_I2C_ADDR, 0x11, NumberFormat.UInt8BE); //turn on bh1750

    /**
    * get light intensity value from bh1750
    */
    //% blockId="readBH1750" 
    //% block="value of light intensity(Lx) from BH1750" 
    //% weight=80
    export function getIntensity(): number {
        let raw_value = Math.idiv(pins.i2cReadNumber(BH1750_I2C_ADDR, NumberFormat.UInt16BE) * 5, 6);



        return raw_value;
    }

    //% blockId="smarthon_waterpump"
    //% block="Set Water pump to intensity %intensity at %pin"
    //% intensity.min=0 intensity.max=1023
    //% weight=50
    export function TurnWaterpump(intensity: number, pin: AnalogPin): void {

        pins.analogWritePin(pin, intensity);
    }

    //% blockId="smarthon_waterpump_period"
    //% block="Set Water pump to intensity %intensity at %pin for %time sec"
    //% intensity.min=0 intensity.max=1023
    //% weight=49
    export function TurnWaterpump_period(intensity: number, pin: AnalogPin, time: number): void {

        pins.analogWritePin(pin, intensity);
        basic.pause(time * 1000);
        pins.analogWritePin(pin, 0);

    }


    /**
     * get soil moisture value (0~100)
     * @param soilmoisturepin describe parameter here, eg: AnalogPin.P1
     */
    //% blockId="readsoilmoisture" 
    //% block="value of soil moisture(0~100) at pin %soilhumiditypin"
    //% weight=78
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

    //% blockId="smarthon_humdifier"
    //% block="Set Humidifier to intensity %intensity at %pin"
    //% intensity.min=0 intensity.max=1023
    //% weight=48

    export function TurnHumdifier(intensity: number, pin: AnalogPin): void {

        pins.analogWritePin(pin, intensity);
    }

    //---Green House-----------------------------------
    //% blockId="smarthon_motorfan"
    //% block="Set Motor Fan to intensity %intensity at %pin"
    //% intensity.min=0 intensity.max=1023
    //% weight=90
    //% blockHidden=false
    //% subcategory="Add On"
    //% group="Green Housing"
    export function TurnMotorFan(intensity: number, pin: AnalogPin): void {
        pins.analogWritePin(pin, intensity);
    }

    //--CO2 and TVOC Sensor (CCS811)----------------------------------------------------
    let TVOC_OK = true
    /* CO2*/
    function indenvGasStatus(): number {
        //pins.setPull(DigitalPin.P19, PinPullMode.PullUp)
        //pins.setPull(DigitalPin.P20, PinPullMode.PullUp)
        //basic.pause(200)
        pins.i2cWriteNumber(90, 0, NumberFormat.UInt8LE, true)
        //basic.pause(200)
        let GasStatus = pins.i2cReadNumber(90, NumberFormat.UInt8LE, false)
        //basic.pause(200)
        return GasStatus
    }

    function indenvGasReady(): boolean {
        if (TVOC_OK != true) {
            return false
        }
        //pins.setPull(DigitalPin.P19, PinPullMode.PullUp)
        //pins.setPull(DigitalPin.P20, PinPullMode.PullUp)
        //basic.pause(200)
        pins.i2cWriteNumber(90, 0, NumberFormat.UInt8LE, true)
        //basic.pause(200)
        if ((pins.i2cReadNumber(90, NumberFormat.UInt8LE, false) % 16) != 8) {
            return false
        }
        return true
    }
    /**
    * CO2 and TVOC Sensor (CCS811) Start
    */
    //% blockId="indenvStart" block="CCS811 Start"
    //% subcategory="Add On"
    //% group="Green Housing"
    //% weight=40
    export function indenvStart(): void {
        TVOC_OK = true
        //pins.setPull(DigitalPin.P19, PinPullMode.PullUp)
        //pins.setPull(DigitalPin.P20, PinPullMode.PullUp)
        //basic.pause(200)
        //basic.pause(200)
        /* CJMCU-8118 CCS811 addr 0x5A reg 0x20 Read Device ID = 0x81 */
        pins.i2cWriteNumber(90, 32, NumberFormat.UInt8LE, true)
        //basic.pause(200)
        if (pins.i2cReadNumber(90, NumberFormat.UInt8LE, false) != 129) {
            TVOC_OK = false
        }
        basic.pause(200)
        /* CJMCU-8118 AppStart CCS811 addr 0x5A register 0xF4 */
        pins.i2cWriteNumber(90, 244, NumberFormat.UInt8LE, false)
        //basic.pause(200)
        /* CJMCU-8118 CCS811 Driving Mode 1 addr 0x5A register 0x01 0x0110 */
        pins.i2cWriteNumber(90, 272, NumberFormat.UInt16BE, false)
        basic.pause(200)
        /* CJMCU-8118 CCS811 Status addr 0x5A register 0x00 return 1 byte */
        pins.i2cWriteNumber(90, 0, NumberFormat.UInt8LE, true)
        //basic.pause(200)
        if (pins.i2cReadNumber(90, NumberFormat.UInt8LE, false) % 2 != 0) {
            TVOC_OK = false
        }
        basic.pause(200)
        pins.i2cWriteNumber(90, 0, NumberFormat.UInt8LE, true)
        //basic.pause(200)
        if (Math.idiv(pins.i2cReadNumber(90, NumberFormat.UInt8LE, false), 16) != 9) {
            TVOC_OK = false
        }
        basic.pause(200)
    }
    /**
     * Set TVOC and CO2 baseline (Baseline should be a decimal value)
     * @param value  , eg: 33915
     */
    //% subcategory="Add On"
    //% group="Green Housing"
    //% blockId=CCS811_setBaseline block="set CO2 and TVOC baseline|%value value"
    //% weight=39
    export function setBaseline(value: number): void {
        let buffer: Buffer = pins.createBuffer(3);
        buffer[0] = 0x20;
        buffer[1] = value >> 8 & 0xff;
        buffer[2] = value & 0xff;
        pins.i2cWriteBuffer(90, buffer);

    }
    /**
    * Read estimated CO2
    */
    //% subcategory="Add On"
    //% group="Green Housing"
    //% blockId="indenvgeteCO2" block="Value of CO2"
    //% weight=38
    export function indenvgeteCO2(): number {

        let i

        i = 0

        while (indenvGasReady() != true) {
            basic.pause(200)
            i = i + 1
            if (i >= 10)
                return -1;
        }
        //pins.setPull(DigitalPin.P19, PinPullMode.PullUp)
        //pins.setPull(DigitalPin.P20, PinPullMode.PullUp)
        //basic.pause(200)
        pins.i2cWriteNumber(90, 2, NumberFormat.UInt8LE, true)
        //basic.pause(200)
        return pins.i2cReadNumber(90, NumberFormat.UInt16BE, false)
    }
    /**
    * Read Total VOC
    */
    //% subcategory="Add On"
    //% group="Green Housing"
    //% blockId="indenvgetTVOC" block="Value of TVOC"
    //% weight=37
    export function indenvgetTVOC(): number {

        let i

        i = 0

        while (indenvGasReady() != true) {
            basic.pause(200)
            i = i + 1
            if (i >= 10)
                return -1;
        }
        //pins.setPull(DigitalPin.P19, PinPullMode.PullUp)
        //pins.setPull(DigitalPin.P20, PinPullMode.PullUp)
        //basic.pause(200)
        pins.i2cWriteNumber(90, 2, NumberFormat.UInt8LE, true)
        //basic.pause(200)
        return (pins.i2cReadNumber(90, NumberFormat.UInt32BE, false) % 65536)
    }
    //---CO2 and TVOC Sensor (CCS811)------------------------------------------------
    //---USB Grow Light--------------------------------------------------
    export enum grow_light_num {
        //% block="Off"
        off = 0,
        //% block="On"
        on = 1
    }
    //% blockId="smarthon_growLight"
    //% block="Set LED Grow Light %onoff at %pin"
    //% subcategory="Add On"
    //% group="Green Housing"
    //% weight=89
    export function Grow_Light(onoff: grow_light_num, pin: DigitalPin): void {
        if (onoff) {
            pins.digitalWritePin(pin, 1);
        } else {
            pins.digitalWritePin(pin, 0);
        }
    }
    //---USB Grow Light--------------------------------------------------
    //---Green House-----------------------------------
    //---Water-------------------------------------------
    //% blockId="smarthon_plantservo"
    //% block="Set Servo to degree %degree at %pin"
    //% intensity.min=0 intensity.max=180
    //% weight=50
    //% subcategory="Add On"
    //% group="Water"
    export function TurnServo(intensity: number, pin: AnalogPin): void {

        pins.servoWritePin(pin, intensity)
    }
    /**
         * get Water Level value (0~100)
         * @param waterlevelpin describe parameter here, eg: AnalogPin.P1
         */
    //% blockId="ReadWaterLevel" 
    //% block="value of water level(0~100) at pin %waterlevelpin"
    //% blockHidden=false
    //% subcategory="Add On"
    //% group="Water"
    //% weight=51
    export function ReadWaterLevel(waterlevelpin: AnalogPin): number {
        let voltage = 0;
        let waterlevel = 0;
        let readvalue = pins.analogReadPin(waterlevelpin)
        readvalue -= 20
        voltage = pins.map(
            readvalue,
            0,
            1023,
            0,
            100
        );
        waterlevel = voltage;
        return Math.round(waterlevel)
    }

    /**
        * get Water temperature value (0~100)
        * @param watertemppin describe parameter here, eg: AnalogPin.P1
        */
    //% blockId="ReadWaterTemp" 
    //% block="read water temperature at pin %watertemppin"
    //% blockHidden=false
    //% subcategory="Add On"
    //% group="Water"
    //% weight=52
    export function ReadWaterTemp(watertemppin: AnalogPin): number {
        // let voltage = 0;
        let watertemp = 0.0;
        let readvalue = pins.analogReadPin(watertemppin);
        readvalue -= 399;
        readvalue /= 15;
        // voltage = pins.map(
        //     readvalue,
        //     0,
        //     1023,
        //     218,
        //     393
        // );
        watertemp = readvalue;
        return Math.round(watertemp)
    }
    //----Water-----------------------

    //-----LCD1602------------------------------------------------
    export enum LcdPosition1602 {
        //% block="1"
        Pos1 = 1,
        //% block="2"
        Pos2 = 2,
        //% block="3"
        Pos3 = 3,
        //% block="4"
        Pos4 = 4,
        //% block="5"
        Pos5 = 5,
        //% block="6"
        Pos6 = 6,
        //% block="7"
        Pos7 = 7,
        //% block="8"
        Pos8 = 8,
        //% block="9"
        Pos9 = 9,
        //% block="10"
        Pos10 = 10,
        //% block="11"
        Pos11 = 11,
        //% block="12"
        Pos12 = 12,
        //% block="13"
        Pos13 = 13,
        //% block="14"
        Pos14 = 14,
        //% block="15"
        Pos15 = 15,
        //% block="16"
        Pos16 = 16,
        //% block="17"
        Pos17 = 17,
        //% block="18"
        Pos18 = 18,
        //% block="19"
        Pos19 = 19,
        //% block="20"
        Pos20 = 20,
        //% block="21"
        Pos21 = 21,
        //% block="22"
        Pos22 = 22,
        //% block="23"
        Pos23 = 23,
        //% block="24"
        Pos24 = 24,
        //% block="25"
        Pos25 = 25,
        //% block="26"
        Pos26 = 26,
        //% block="27"
        Pos27 = 27,
        //% block="28"
        Pos28 = 28,
        //% block="29"
        Pos29 = 29,
        //% block="30"
        Pos30 = 30,
        //% block="31"
        Pos31 = 31,
        //% block="32"
        Pos32 = 32
    }



    export enum LcdBacklight {
        //% block="off"
        Off = 0,
        //% block="on"
        On = 8
    }

    export enum TextAlignment {
        //% block="left-aligned"
        Left,
        //% block="right-aligned"
        Right,
        //% block="center-aligned"
        Center
    }

    export enum TextOption {
        //% block="align left"
        AlignLeft,
        //% block="align right"
        AlignRight,
        //% block="align center"
        AlignCenter
    }


    export enum Lcd {
        Command = 0,
        Data = 1
    }

    interface LcdState {
        i2cAddress: uint8;
        backlight: LcdBacklight;
        characters: Buffer;
        rows: uint8;
        columns: uint8;
        lineNeedsUpdate: uint8;
        refreshIntervalId: number;
    }

    let lcdState: LcdState = undefined;

    function connect(): boolean {
        if (0 != pins.i2cReadNumber(39, NumberFormat.Int8LE, false)) {
            // PCF8574
            connectLcd();
        } else if (0 != pins.i2cReadNumber(63, NumberFormat.Int8LE, false)) {
            // PCF8574A
            connectLcd();
        }
        return !!lcdState;
    }

    // Write 4 bits (high nibble) to I2C bus
    function write4bits(value: number) {
        if (!lcdState && !connect()) {
            return;
        }
        pins.i2cWriteNumber(lcdState.i2cAddress, value, NumberFormat.Int8LE);
        pins.i2cWriteNumber(lcdState.i2cAddress, value | 0x04, NumberFormat.Int8LE);
        control.waitMicros(1);
        pins.i2cWriteNumber(
            lcdState.i2cAddress,
            value & (0xff ^ 0x04),
            NumberFormat.Int8LE
        );
        control.waitMicros(50);
    }

    // Send high and low nibble
    function send(RS_bit: number, payload: number) {
        if (!lcdState) {
            return;
        }
        const highnib = payload & 0xf0;
        write4bits(highnib | lcdState.backlight | RS_bit);
        const lownib = (payload << 4) & 0xf0;
        write4bits(lownib | lcdState.backlight | RS_bit);
    }

    // Send command
    function sendCommand(command: number) {
        send(Lcd.Command, command);
    }

    // Send data
    function sendData(data: number) {
        send(Lcd.Data, data);
    }

    // Set cursor
    function setCursor(line: number, column: number) {
        const offsets = [0x00, 0x40, 0x14, 0x54];
        sendCommand(0x80 | (offsets[line] + column));
    }

    function updateCharacterBuffer(
        text: string,
        offset: number,
        length: number,
        columns: number,
        rows: number,
        alignment: TextAlignment,
        pad: string
    ): void {
        if (!lcdState && !connect()) {
            return;
        }

        if (!lcdState.refreshIntervalId) {
            lcdState.refreshIntervalId = control.setInterval(refreshDisplay, 500, control.IntervalMode.Timeout)
        }

        if (lcdState.columns === 0) {
            lcdState.columns = columns;
            lcdState.rows = rows;
            lcdState.characters = pins.createBuffer(lcdState.rows * lcdState.columns);

            // Clear display and buffer
            const whitespace = "x".charCodeAt(0);
            for (let pos = 0; pos < lcdState.rows * lcdState.columns; pos++) {
                lcdState.characters[pos] = whitespace;
            }
            updateCharacterBuffer(
                "",
                0,
                lcdState.columns * lcdState.rows,
                lcdState.columns,
                lcdState.rows,
                TextAlignment.Left,
                " "
            );
        }

        if (columns !== lcdState.columns || rows !== lcdState.rows) {
            return;
        }

        const fillCharacter =
            pad.length > 0 ? pad.charCodeAt(0) : " ".charCodeAt(0);

        let endPosition = offset + length;
        if (endPosition > lcdState.columns * lcdState.rows) {
            endPosition = lcdState.columns * lcdState.rows;
        }
        let lcdPos = offset;

        // Add padding at the beginning
        let paddingEnd = offset;

        if (alignment === TextAlignment.Right) {
            paddingEnd = endPosition - text.length;
        }
        else if (alignment === TextAlignment.Center) {
            paddingEnd = offset + Math.idiv(endPosition - offset - text.length, 2);
        }

        while (lcdPos < paddingEnd) {
            if (lcdState.characters[lcdPos] != fillCharacter) {
                lcdState.characters[lcdPos] = fillCharacter;
                lcdState.lineNeedsUpdate |= (1 << Math.idiv(lcdPos, lcdState.columns))
            }
            lcdPos++;
        }

        // Copy the text
        let textPosition = 0;
        while (lcdPos < endPosition && textPosition < text.length) {

            if (lcdState.characters[lcdPos] != text.charCodeAt(textPosition)) {
                lcdState.characters[lcdPos] = text.charCodeAt(textPosition);
                lcdState.lineNeedsUpdate |= (1 << Math.idiv(lcdPos, lcdState.columns))
            }
            lcdPos++;
            textPosition++;
        }

        // Add padding at the end
        while (lcdPos < endPosition) {
            if (lcdState.characters[lcdPos] != fillCharacter) {
                lcdState.characters[lcdPos] = fillCharacter;
                lcdState.lineNeedsUpdate |= (1 << Math.idiv(lcdPos, lcdState.columns))
            }
            lcdPos++;
        }
    }

    function sendLine(line: number): void {
        setCursor(line, 0);

        for (let position = lcdState.columns * line; position < lcdState.columns * (line + 1); position++) {
            sendData(lcdState.characters[position]);
        }
    }

    function refreshDisplay() {
        if (!lcdState) {
            return;
        }
        lcdState.refreshIntervalId = undefined

        for (let i = 0; i < lcdState.rows; i++) {
            if (lcdState.lineNeedsUpdate & 1 << i) {
                lcdState.lineNeedsUpdate &= ~(1 << i)
                sendLine(i)
            }
        }
    }

    function toAlignment(option?: TextOption): TextAlignment {
        if (
            option === TextOption.AlignRight
        ) {
            return TextAlignment.Right;
        } else if (option === TextOption.AlignCenter) {
            return TextAlignment.Center;
        } else {
            return TextAlignment.Left;
        }
    }





    /**
      * Displays a text on a LCD1602 in the given position range.
      * The text will be cropped if it is longer than the provided length.
      * If there is space left, it will be filled with pad characters.
      * @param text the text to show, eg: "Smarthon"
      * @param startPosition the start position on the LCD, [1 - 32]
      * @param length the maximum space used on the LCD, eg: 16
      * @param option configures alignment, eg: TextOption.Left
      */
    //% subcategory=LCD
    //% blockId="lcd_show_string_on_1602"
    //% block="LCD show %text | at position %startPosition=lcd_position_1602 with length %length || and %option"
    //% text.shadowOptions.toString=true
    //% length.min=1 length.max=32 length.fieldOptions.precision=1
    //% expandableArgumentMode="toggle"
    //% inlineInputMode="inline"
    //% weight=90
    export function showStringOnLcd1602(
        text: string,
        startPosition: number,
        length: number,
        option?: TextOption
    ): void {
        updateCharacterBuffer(
            text,
            startPosition - 1,
            length,
            16,
            2,
            toAlignment(option),
            " "
        );
    }



    /**
       * Clears the LCD1602 completely.
       */
    //% subcategory=LCD
    //% blockId="lcd_clear_1602" block="LCD clear display"
    //% weight=75
    export function clearLcd1602(): void {
        showStringOnLcd1602("", 1, 32);
    }


    /**
     * Turns a LCD position into a number.
     * @param pos the LCD position, eg: LcdPosition1602.Pos1
     */
    //% subcategory=LCD
    //% blockId=lcd_position_1602
    //% block="%pos"
    //% pos.fieldEditor="gridpicker"
    //% pos.fieldOptions.columns=16
    //% blockHidden=true
    export function position1602(pos: LcdPosition1602): number {
        return pos;
    }



    /**
     * Enables or disables the backlight of the LCD.
     * @param backlight new state of backlight, eg: LcdBacklight.On
     */
    //% blockId="makerbit_lcd_backlight" block="LCD backlight %backlight"
    //% weight=79
    //% subcategory=LCD
    export function setLcdBacklight(backlight: LcdBacklight): void {
        if (!lcdState && !connect()) {
            return;
        }
        lcdState.backlight = backlight;
        send(Lcd.Command, 0);
    }



    /**
     * Connects to the LCD at a given I2C address.
     * The addresses 39 (PCF8574) or 63 (PCF8574A) seem to be widely used.
       */
    //% subcategory=LCD
    //% blockId="lcd_set_address" block="Initialize LCD at I2C"
    //% weight=100
    export function connectLcd(): void {

        if (0 === pins.i2cReadNumber(39, NumberFormat.Int8LE, false)) {
            return;
        }

        if (lcdState && lcdState.refreshIntervalId) {
            control.clearInterval(lcdState.refreshIntervalId, control.IntervalMode.Timeout)
            lcdState.refreshIntervalId = undefined
        }

        lcdState = {
            i2cAddress: 39,
            backlight: LcdBacklight.On,
            columns: 0,
            rows: 0,
            characters: undefined,
            lineNeedsUpdate: 0,
            refreshIntervalId: undefined,
        };

        // Wait 50ms before sending first command to device after being powered on
        basic.pause(50);

        // Pull both RS and R/W low to begin commands
        pins.i2cWriteNumber(
            lcdState.i2cAddress,
            lcdState.backlight,
            NumberFormat.Int8LE
        );
        basic.pause(50);

        // Set 4bit mode
        write4bits(0x30);
        control.waitMicros(4100);
        write4bits(0x30);
        control.waitMicros(4100);
        write4bits(0x30);
        control.waitMicros(4100);
        write4bits(0x20);
        control.waitMicros(1000);

        // Configure function set
        const LCD_FUNCTIONSET = 0x20;
        const LCD_4BITMODE = 0x00;
        const LCD_2LINE = 0x08; // >= 2 lines
        const LCD_5x8DOTS = 0x00;
        send(Lcd.Command, LCD_FUNCTIONSET | LCD_4BITMODE | LCD_2LINE | LCD_5x8DOTS);
        control.waitMicros(1000);

        // Configure display
        const LCD_DISPLAYCONTROL = 0x08;
        const LCD_DISPLAYON = 0x04;
        const LCD_CURSOROFF = 0x00;
        const LCD_BLINKOFF = 0x00;
        send(
            Lcd.Command,
            LCD_DISPLAYCONTROL | LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF
        );
        control.waitMicros(1000);

        // Set the entry mode
        const LCD_ENTRYMODESET = 0x04;
        const LCD_ENTRYLEFT = 0x02;
        const LCD_ENTRYSHIFTDECREMENT = 0x00;
        send(
            Lcd.Command,
            LCD_ENTRYMODESET | LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT
        );
        control.waitMicros(1000);
    }

    /**
     * Returns true if a LCD is connected. False otherwise.
     */
    //% subcategory=LCD
    //% blockId="lcd_is_connected" block="LCD is connected"
    //% weight=69
    //% blockHidden=true
    export function isLcdConnected(): boolean {
        return !!lcdState || connect();
    }
    //--------LCD1602-----------------------------------------------------
}

