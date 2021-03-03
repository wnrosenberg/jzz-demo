import JZZ from 'jzz';

// Library for handling MIDI messages.

// MIDI Messages
const MSG_CLOCK = [0xf8];
// const MSG_DEVICE_INQ = [0xF0, 0x7E, 0x7F, 0x06, 0x01, 0xF7];
// const MSG_VERSION_INQ = [0xF0, 0x00, 0x20, 0x29, 0x00, 0x70, 0xf7];
const MSG_SCROLL_END = [...CMD_HEADER, ...TYPE_SCROLL_END, ...CMD_TAIL];

// Sysex Commands: HEADER + TYPE + DATA + TAIL
const CMD_HEADER = [0xf0, 0x00, 0x20, 0x29, 0x02, 0x10];
const CMD_TAIL = [0xf7];

// Sysex Types: Change color of pads.
export const TYPE_PAD_COLOR = [0x0a]; // pad(color)
export const TYPE_COL_COLOR = [0x0c]; // col(color)
export const TYPE_ROW_COLOR = [0x0d]; // row(color)
export const TYPE_GRID_COLOR = [0x0e]; // grid(color)
export const TYPE_PAD_FLASH = [0x23]; // flashpad(color)
export const TYPE_PAD_PULSE = [0x28]; // pulsepad(color)
export const TYPE_PAD_RGB = [0x08]; // pad(rgb)
export const TYPE_GRID_RGB = [0x0f]; // grid(type, rgb) // type: 0=10x10, 1=8x8

// Sysex Types: Built-in scrolling text.
export const TYPE_SCROLL = [0x14]; // scroll(color, loop, text) // loop: bool
export const TYPE_SCROLL_END = [0x15]; // response on scroll iteration

// Sysex Types: Set Current Layout
export const TYPE_LAYOUT_SET = [0x2c]; // 00=note,01=drum,02=fader,03=programmer
export const TYPE_LAYOUT_STATUS = [0x2f]; // response to SET

// Sysex Types: Get / Set Current Layout
export const TYPE_MODE_SET = [0x21]; // 00=ableton, 01=standalone
export const TYPE_MODE_STATUS = [0x2d]; // response to SET


// @TODO data validation
export const getMsg = (type, data=[]) => {
	// velocity-based color range 0 (off), 1 - 127 / [0x00 - 0x7f]
	// rgb brightness range 0 (off), 1 - 63 / [0x00 - 0x3f]

	if (type === TYPE_PAD_COLOR) {
		
		// takes up to 97 pairs of [index, color] (including side)
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...data.flat(), ...CMD_TAIL ]);

	} else if (type === TYPE_COL_COLOR) {

		// takes a column index 0-9 and up to 10 colors
		// const [index, ...colors] = data;
		// cols 0 and 9 need placeholders for corners
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...data.flat(), ...CMD_TAIL ]);

	} else if (type === TYPE_ROW_COLOR) {

		// takes a row index 0-9 and up to 10 colors
		// const [index, ...colors] = data;
		// rows 0 and 9 need placeholders for corners
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...data.flat(), ...CMD_TAIL ]);

	} else if (type === TYPE_GRID_COLOR) {

		// takes a single color
		// const [color] = data;
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...data.flat(), ...CMD_TAIL ]);

	} else if (type === TYPE_PAD_FLASH) {

		// takes up to 97 pairs of [index, color] (including side)
		// send Note On or SysEx message to stop flashing
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...data.flat(), ...CMD_TAIL ]);

	} else if (type === TYPE_PAD_PULSE) {

		// takes up to 97 pairs of [index, color] (including side)
		// send Note On or SysEx message to stop pulsing
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...data.flat(), ...CMD_TAIL ]);

	} else if (type === TYPE_PAD_RGB) {

		// takes up to 78 quads of [index, r, g, b] (including side)
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...data.flat(), ...CMD_TAIL ]);

	} else if (type === TYPE_GRID_RGB) {

		// takes a quad of [gridmode, r, g, b]
		// const [mode, rcolor, gcolor, bcolor] = data;

		// mode is 0 for 10x10 grid, or 1 for 8x8 grid
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...data.flat(), ...CMD_TAIL ]);

	} else if (type === TYPE_SCROLL) {

		// takes array of [color, loop, text]
		// if (loop > 0) {
		// 	create listener for loop 
		// }
		
		// color is velocity-based
		// loop is 1 to enable, 0 scrolls it once
		// text is array of ASCII text and speed characters
		// speed is 0x01 through 0x07 default is 0x04

		// when scrolling ends, pads return to previous colors.
		// after each scroll, launchpad sends back dataless SCROLL_END cmd
		// to stop scrolling, send dataless SCROLL cmd.
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...data.flat(), ...CMD_TAIL ]);

	} else if (type === TYPE_LAYOUT_STATUS) {

		// request the layout status (no data passed)
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...CMD_TAIL ]);

	} else if (type === TYPE_LAYOUT_SET) {

		// update the layout to the specified data
		return JZZ.MIDI([ ...CMD_HEADER, ...type, data, ...CMD_TAIL ]);

	} else if (type === TYPE_MODE_STATUS) {

		// request the mode status (no data passed)
		return JZZ.MIDI([ ...CMD_HEADER, ...type, ...CMD_TAIL ]);

	} else if (type === TYPE_MODE_SET) {

		// update the mode to the specified data
		return JZZ.MIDI([ ...CMD_HEADER, ...type, data, ...CMD_TAIL ]);

	} else {

		// UNKNOWN OR UNSUPPORTED METHOD
		return null;
	}
};


// Use port.send() with native jzz code.

// export const sendMsg = (port, msg, options=[]) => {
// 	if (!options.cb || typeof options.cb !== 'function') options.cb = ()=>{};
// 	if (!options.errcb || typeof options.errcb !== 'function') options.errcb = err=>console.error(err);
// 	if (options.delay > 0) {
// 		port.wait(options.delay)
// 		    .send(msg).then(options.cb, options.errcb);
// 	} else {
// 		port.send(msg).then(options.cb, options.errcb);
// 	}
// };

// const setDeviceLayout = (input, output, mode) => {
// 	// Send the message on output and confirm response on input.
// 	input.connect(function(){
// 		// listen for response	
// 	})
// 	output.send(getMsg(TYPE_LAYOUT_SET, mode));
// 	 = [0x2c]; // 00=note,01=drum,02=fader,03=programmer	
// 	TYPE_LAYOUT_STATUS = [0x2f]; // response to SET
// }
