/**
 * Custom blocks
 */
//% weight=98 color=#7abb4b icon="\uf06c" block="SmartGarden"
namespace environment {

    // keep track of services
    //let rainMonitorStarted = false;
    //let windMonitorStarted = false;
    let weatherMonitorStarted = false;
    // Keep Track of weather monitoring variables
    //let numRainDumps = 0
    //let numWindTurns = 0
    //let windMPH = 0

    let BH1750I2CADDR = 35;
    pins.i2cWriteNumber(BH1750I2CADDR, 0x11, NumberFormat.UInt8BE); //turn on bh1750

    /**
    * get light intensity value from bh1750
    */
    //% blockId="readBH1750" 
    //% block="light intensity(Lx) from I2C BH1750" 
    //% weight=80
    export function getIntensity(): number {
        let raw_value = Math.idiv(pins.i2cReadNumber(BH1750I2CADDR, NumberFormat.UInt16BE) * 5, 6);

        return raw_value;
    }

    /**
     * get soil moisture value (0~100)
     * @param soilmoisturepin describe parameter here, eg: AnalogPin.P1
     */
    //% blockId="readsoilmoisture" 
    //% block="soil moisture(0~100) at pin %soilmoisturepin"
    //% weight=78
    export function readSoilHumidity(soilmoisturepin: AnalogPin): number {
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


    //-------DHT11---------------------------------------------------


    export enum tempDegree {
        //% block="°C"
        degreeCelsius,
        //% block="°F"
        degreeFahrenheit
    }

    let _temperature: number = -999.0
    let _humidity: number = -999.0
    let _readSuccessful: boolean = false
    let _errorCode: number = 0
    let _firReadSuccess: boolean = false

    // 使用固定長度的數組，避免動態分配
    let timings = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    let rawData = [0, 0, 0, 0, 0]

    /**
     * Query the temperature and humidity infromation from DHT11 Temperature and Humidity sensor
     * @param fluSucc Keep trying until the first read succeeds when the Micro:bit starts, eg:true 
     * @param lastvalue If a reading fails, show the last successful temperature & humidity instead of -999, eg:true
     * @param wait2Second Adds extra delay after each successful reading (recommended by datasheet is ~1.5s), eg:false
     * @param luSucc If a reading fails, keep retrying until it succeeds (instead of failing immediately), eg:false
     */
    //% block="read temperature & humidity sensor at pin %dataPin||first successful read %fluSucc|use last valid value on error %lastvalue|wait 2 seconds after successful read %wait2Second|retry every read until success %luSucc"
    //% blockId="get_dht11_value"
    //% group="Temperature and Humidity Sensor (DHT11)"
    //% expandableArgumentMode="enabled"
    //% weight=52
    export function dht11QueryData(dataPin: DigitalPin, fluSucc: boolean = true, lastvalue: boolean = true, wait2Second: boolean = false, luSucc: boolean = false): void {
        //initialize
        _readSuccessful = false
        _errorCode = 0
        if (!lastvalue) {
            _temperature = -999.0
            _humidity = -999.0
        }

        // 1. 發送啟動信號
        pins.digitalWritePin(dataPin, 0)
        basic.pause(18)

        pins.setPull(dataPin, PinPullMode.PullUp)
        pins.digitalReadPin(dataPin)
        control.waitMicros(40)

        // 2. 等待傳感器響應
        if (pins.digitalReadPin(dataPin) == 1) {
            _errorCode = 1
            return
        }

        // wait signal
        while (pins.digitalReadPin(dataPin) == 0);
        while (pins.digitalReadPin(dataPin) == 1);

        for (let i = 0; i < 40; i++) {
            while (pins.digitalReadPin(dataPin) == 0); // waiting

            let count = 0
            while (pins.digitalReadPin(dataPin) == 1) {
                count++
                if (count > 2000) {
                    _errorCode = 2
                    break // Timeout
                }
            }
            timings[i] = count
        }

        let max = 0
        let min = 1000
        for (let i = 0; i < 40; i++) {
            if (timings[i] > max) max = timings[i]
            if (timings[i] < min) min = timings[i]
        }
        let threshold = (max + min) >> 1 // 取中間值作為 0 和 1 的分界

        // reset rawData
        for (let k = 0; k < 5; k++) rawData[k] = 0

        for (let j = 0; j < 40; j++) {
            if (timings[j] > threshold) {
                let index = Math.floor(j / 8)
                let shift = 7 - (j % 8)
                rawData[index] |= (1 << shift)
            }
        }

        // 5. 校驗與賦值
        if ((rawData[0] + rawData[1] + rawData[2] + rawData[3]) % 256 == rawData[4]) {
            if (rawData[0] != -999 || rawData[2] != -999) {
                _humidity = rawData[0]
                _temperature = rawData[2]
                _readSuccessful = true
                _firReadSuccess = true
                if (wait2Second) {
                    basic.pause(2000)
                }
                return
            } else {
                _errorCode = 4 // 數據異常
            }
        } else {
            _errorCode = 3 // 校驗失敗
        }
        if ((_readSuccessful == false) && (luSucc == true)) {
            basic.pause(500)
            return dht11QueryData(dataPin, fluSucc, lastvalue, wait2Second, luSucc)
        }
        if ((_readSuccessful == false) && (fluSucc == true) && (_firReadSuccess == false)) {
            basic.pause(500)
            return dht11QueryData(dataPin, fluSucc, lastvalue, wait2Second, luSucc)
        }
    }

    /**
     * Get the Temperature value (degree in Celsius or Fahrenheit) after queried the Temperature and Humidity sensor
     */

    //% block="temperature|%tempdegree"
    //% group="Temperature and Humidity Sensor (DHT11)"
    //% weight=51
    export function readTemperatureData(tempdegree: tempDegree): number {
        // querydata
        if (tempdegree == tempDegree.degreeCelsius) {
            return Math.round(_temperature * 100) / 100
        }
        else {
            return Math.round((_temperature * 1.8) + 32)
        }
    }

    /**
     * Get the humidity value (in percentage) after queried the Temperature and Humidity sensor
     */
    //% block="humidity"
    //% group="Temperature and Humidity Sensor (DHT11)"
    //% weight=50
    export function readHumidityData(): number {
        // querydata

        return Math.round(_humidity)


    }

    /**
    * Get the error code after query (for debugging)
    */
    //% block="error code"
    //% group="Temperature and Humidity Sensor (DHT11)"
    //% weight=49
    export function getErrorCode(): number {
        return _errorCode
    }

    //-------DHT11---------------------------------------------------

    //% subcategory=More
    //% group=Output
    //% blockId="smarthon_waterpump_period"
    //% block="set water pump to intensity %intensity at %pin||for %time sec"
    //% intensity.min=0 intensity.max=1023
    //% weight=390
    export function turnWaterpumpPeriod(intensity: number, pin: AnalogPin, time: number = 0): void {
        pins.analogWritePin(pin, intensity);
        if (time > 0) {
            basic.pause(time * 1000);
            pins.analogWritePin(pin, 0);
        }
    }

    //% subcategory=More
    //% group=Output
    //% blockId="smarthon_humdifier"
    //% block="set humidifier to intensity %intensity at %pin"
    //% intensity.min=0 intensity.max=1023
    //% weight=380
    export function turnHumdifier(intensity: number, pin: AnalogPin): void {

        pins.analogWritePin(pin, intensity);
    }


    //-----LCD1602------------------------------------------------
    export enum lcdPosition1602 {
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



    export enum lcdBacklight {
        //% block="off"
        Off = 0,
        //% block="on"
        On = 8
    }

    export enum textAlignment {
        //% block="left-aligned"
        Left,
        //% block="right-aligned"
        Right,
        //% block="center-aligned"
        Center
    }

    export enum textOption {
        //% block="align left"
        AlignLeft,
        //% block="align right"
        AlignRight,
        //% block="align center"
        AlignCenter
    }


    export enum lcd {
        Command = 0,
        Data = 1
    }

    interface LcdState {
        i2cAddress: uint8;
        backlight: lcdBacklight;
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
        send(lcd.Command, command);
    }

    // Send data
    function sendData(data: number) {
        send(lcd.Data, data);
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
        alignment: textAlignment,
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
                textAlignment.Left,
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

        if (alignment === textAlignment.Right) {
            paddingEnd = endPosition - text.length;
        }
        else if (alignment === textAlignment.Center) {
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

    function toAlignment(option?: textOption): textAlignment {
        if (
            option === textOption.AlignRight
        ) {
            return textAlignment.Right;
        } else if (option === textOption.AlignCenter) {
            return textAlignment.Center;
        } else {
            return textAlignment.Left;
        }
    }

    /**
     * Connects to the LCD at a given I2C address.
     * The addresses 39 (PCF8574) or 63 (PCF8574A) seem to be widely used.
       */

    //% subcategory=More
    //% group=LCD
    //% blockId="lcd_set_address" 
    //% block="initialize LCD at I2C"
    //% weight=370
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
            backlight: lcdBacklight.On,
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
        send(lcd.Command, LCD_FUNCTIONSET | LCD_4BITMODE | LCD_2LINE | LCD_5x8DOTS);
        control.waitMicros(1000);

        // Configure display
        const LCD_DISPLAYCONTROL = 0x08;
        const LCD_DISPLAYON = 0x04;
        const LCD_CURSOROFF = 0x00;
        const LCD_BLINKOFF = 0x00;
        send(
            lcd.Command,
            LCD_DISPLAYCONTROL | LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF
        );
        control.waitMicros(1000);

        // Set the entry mode
        const LCD_ENTRYMODESET = 0x04;
        const LCD_ENTRYLEFT = 0x02;
        const LCD_ENTRYSHIFTDECREMENT = 0x00;
        send(
            lcd.Command,
            LCD_ENTRYMODESET | LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT
        );
        control.waitMicros(1000);
    }

    /**
      * Displays a text on a LCD1602 in the given position range.
      * The text will be cropped if it is longer than the provided length.
      * If there is space left, it will be filled with pad characters.
      * @param text1 the text to show, eg: "Smarthon"
      * @param text2 the text to show, eg: ""
      * @param startPosition the start position on the LCD, [1 - 32]
      * @param length the maximum space used on the LCD, eg: 16
      * @param option configures alignment, eg: TextOption.Left
      */
    //% subcategory=More
    //% group=LCD
    //% blockId="lcd_show_string_on_1602"
    //% block="LCD show %text1 %text2 at position %startPosition=lcd_position_1602 with length %length || and %option"
    //% text1.shadow="text"
    //% text1.shadowOptions.toString=true
    //% text2.shadow="text"
    //% text2.shadowOptions.toString=true
    //% text2.defl=""
    //% length.min=1 length.max=32 length.fieldOptions.precision=1
    //% expandableArgumentMode="toggle"
    //% inlineInputMode="inline"
    //% weight=360
    export function showStringOnLcd1602(
        text1: string,
        text2: string = "",
        startPosition: number,
        length: number,
        option?: textOption
    ): void {
        let fullText = text1 + text2;
        updateCharacterBuffer(
            fullText,
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
    //% subcategory=More
    //% group=LCD
    //% blockId="lcd_clear_1602" block="LCD clear display"
    //% weight=350
    export function clearLcd1602(): void {
        showStringOnLcd1602("","", 1, 32);
    }

    /**
     * Enables or disables the backlight of the LCD.
     * @param backlight new state of backlight, eg: LcdBacklight.On
     */
    //% blockId="makerbit_lcd_backlight" block="LCD backlight %backlight"
    //% group=LCD
    //% weight=340
    //% subcategory=More
    export function setLcdBacklight(backlight: lcdBacklight): void {
        if (!lcdState && !connect()) {
            return;
        }
        lcdState.backlight = backlight;
        send(lcd.Command, 0);
    }

    /**
     * Turns a LCD position into a number.
     * @param pos the LCD position, eg: environment.lcdPosition1602.Pos1
     */
    //% subcategory=More
    //% group=LCD
    //% blockId=lcd_position_1602
    //% block="%pos"
    //% pos.fieldEditor="gridpicker"
    //% pos.fieldOptions.columns=16
    //% blockHidden=true
    export function position1602(pos: lcdPosition1602): number {
        return pos;
    }

    /**
     * Returns true if a LCD is connected. False otherwise.
     */
    //% subcategory=More
    //% blockId="lcd_is_connected" block="LCD is connected"
    //% blockHidden=true
    export function isLcdConnected(): boolean {
        return !!lcdState || connect();
    }
    //--------LCD1602-----------------------------------------------------

    //---GreenHouse-----------------------------------
    //% blockId="smarthon_motorfan"
    //% block="set ventilation fan to intensity %intensity at %pin"
    //% intensity.min=0 intensity.max=1023
    //% weight=90
    //% blockHidden=false
    //% subcategory="GreenHouse"
    //% group=""
    export function turnMotorFan(intensity: number, pin: AnalogPin): void {
        pins.analogWritePin(pin, intensity);
    }

    //--CO2 and TVOC Sensor (CCS811)----------------------------------------------------
    let TVOCOK = true
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
        if (TVOCOK != true) {
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
    //% blockId="indenvStart" 
    //% block="initialize CO2 & TVOC Sensor at I2C"
    //% subcategory="GreenHouse"
    //% group="CO2 and TVOC Sensor (CCS811)"
    //% weight=40
    export function indenvStart(): void {
        TVOCOK = true
        //pins.setPull(DigitalPin.P19, PinPullMode.PullUp)
        //pins.setPull(DigitalPin.P20, PinPullMode.PullUp)
        //basic.pause(200)
        //basic.pause(200)
        /* CJMCU-8118 CCS811 addr 0x5A reg 0x20 Read Device ID = 0x81 */
        pins.i2cWriteNumber(90, 32, NumberFormat.UInt8LE, true)
        //basic.pause(200)
        if (pins.i2cReadNumber(90, NumberFormat.UInt8LE, false) != 129) {
            TVOCOK = false
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
            TVOCOK = false
        }
        basic.pause(200)
        pins.i2cWriteNumber(90, 0, NumberFormat.UInt8LE, true)
        //basic.pause(200)
        if (Math.idiv(pins.i2cReadNumber(90, NumberFormat.UInt8LE, false), 16) != 9) {
            TVOCOK = false
        }
        basic.pause(200)
    }
    /**
     * Set TVOC and CO2 baseline (Baseline should be a decimal value)
     * @param value  , eg: 33915
     */
    //% subcategory="GreenHouse"
    //% group="CO2 and TVOC Sensor (CCS811)"
    //% blockId=CCS811_setBaseline 
    //% block="set baseline|%value value"
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
    //% subcategory="GreenHouse"
    //% group="CO2 and TVOC Sensor (CCS811)"
    //% blockId="indenvgeteCO2" 
    //% block="CO2"
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
    //% subcategory="GreenHouse"
    //% group="CO2 and TVOC Sensor (CCS811)"
    //% blockId="indenvgetTVOC" 
    //% block="TVOC"
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
    //%subcategory="GreenHouse"
    //%blockId=control_Servo
    //%block="turn servo to %deg degree |at %pin"
    //% weight=100
    //% deg.min=0 deg.max=180
    export function turnservo(deg: number, pin: AnalogPin): void {
        pins.servoWritePin(pin, deg)
        basic.pause(500)
    }

    //---USB Grow Light--------------------------------------------------
    export enum growLightNum {
        //% block="Off"
        off = 0,
        //% block="On"
        on = 1
    }
    //---USB Grow Light--------------------------------------------------

    //---Water-------------------------------------------
    //% blockId="smarthon_plantservo"
    //% block="set servo to degree %degree at %pin"
    //% intensity.min=0 intensity.max=180
    //% weight=50
    //% subcategory="Aquaponics"
    export function turnServo(intensity: number, pin: AnalogPin): void {

        pins.servoWritePin(pin, intensity)
    }

    /**
     * get Water Level value (0~100)
     * @param waterlevelpin describe parameter here, eg: AnalogPin.P1
     */
    //% blockId="ReadWaterLevel" 
    //% block="water level(0~100) at pin %waterlevelpin"
    //% blockHidden=false
    //% subcategory="Aquaponics"
    //% weight=51
    export function readWaterLevel(waterlevelpin: AnalogPin): number {
        let voltage = 0;
        let waterlevel = 0;
        let readvalue = pins.analogReadPin(waterlevelpin)
        readvalue -= 20
        voltage = pins.map(
            readvalue,
            0,
            950,
            0,
            100
        );
        waterlevel = voltage;
        return Math.round(waterlevel * 100) / 100
    }

    /**
    * get Water temperature value (0~100)
    * @param watertemppin describe parameter here, eg: AnalogPin.P1
    */
    //% blockId="ReadWaterTemp" 
    //% block="water temperature at pin %watertemppin"
    //% blockHidden=false
    //% subcategory="Aquaponics"
    //% weight=52
    export function readWaterTemp(watertemppin: AnalogPin): number {
        // let voltage = 0;
        let watertemp = 0.0;
        let sum = 0;
        let readvalue = 0;
        for (let i = 0; i < 30; i++) {
            sum += pins.analogReadPin(watertemppin);
            basic.pause(10);
        }
        readvalue = sum / 30;
        readvalue -= 399;
        readvalue /= 15;
        // voltage = pins.map(
        //     readvalue,
        //     0,
        //     1023,
        //     218,
        //     393
        // );
        return Math.round(readvalue * 100) / 100
    }
    //----Water-----------------------
    //----end of green Housing-----------------

}