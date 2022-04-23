import JZZ from 'jzz';
import {
	getMsg,
	sendMsg,
	TYPE_PAD_COLOR,
	TYPE_COL_COLOR,
	TYPE_ROW_COLOR,
	TYPE_GRID_COLOR,
	TYPE_PAD_FLASH,
	TYPE_PAD_PULSE,
	TYPE_PAD_RGB,
	TYPE_GRID_RGB,
	TYPE_SCROLL,
	TYPE_LAYOUT_STATUS,
	TYPE_LAYOUT_SET,
	TYPE_MODE_STATUS,
	TYPE_MODE_SET
} from '../helpers/message';

class LaunchPad {

	// Instance fields
	input; // the input port
	output; // the output port

	/**
	 * LaunchPad() - instantiate a new LaunchPad object.
	 * @param options 			Array of options
	 * @param options.input 	Input port (required for listening)
	 * @param options.output 	Output port (required)
	 * @param options.layout 	Set layout mode, default: 3 (programmer)
	 */
	constructor(options=[]) {
		// Set the input port.
		if (options.input) {
			this.input = options.input;
		} else {
			console.error("LP: Invalid input port.");
		}

		// Set the output port.
		if (options.output) {
			this.output = options.output;
		} else {
			console.error("LP: Invalid output port.");
		}

		// Set the layout mode.
		if (options.layout) {
			this.output.send(getMsg(TYPE_LAYOUT_SET, options.layout));
		} else {
			// default to programmer layout.
			this.output.send(getMsg(TYPE_LAYOUT_SET, 3));
		}
	}

	//
	// MIDI message Senders & Getters
	//

	// Send / get a MIDI msg to change pad color.
	// @param pads 		Array(97) of Array(2)[index, color] (incl side led)
	sendPadChange(pads) {
		return this.output.send(this.getPadChange(pads));
	}
	getPadChange(pads) {
		return getMsg(TYPE_PAD_COLOR, pads);
	}

	// Send / get a MIDI msg to change column color.
	// @param col 		Array(11) with a column index [0-9] and up to 10 colors.
	//					Note: cols 0 and 9 need placeholders for corners
	sendColChange(col) {
		return this.output.send(this.getColChange(col));
	}
	getColChange(col) {
		return getMsg(TYPE_COL_COLOR, col);
	}

	// Send / get a MIDI msg to change row color.
	// @param row 		Array(11) with a row index [0-9] and up to 10 colors.
	//					Note: rows 0 and 9 need placeholders for corners
	sendRowChange(row) {
		return this.output.send(this.getRowChange(row));
	}
	getRowChange(row) {
		return getMsg(TYPE_ROW_COLOR, row);
	}
	
	// Send / get msg to change the entire grid to a color.
	// @param color 	Array(1) with a single color.
	sendAllChange(color) {
		return this.output.send(this.getAllChange(color));
	}
	getAllChange(color) {
		return getMsg(TYPE_GRID_COLOR, color);
	}

	// Send / get MIDI msg to flash pads.
	// @param pads 		Array(97) of Array(2)[index, color] (incl side led)
	// 					Note: send Note On or SysEx msg to stop flashing
	sendFlash(pads) {
		return this.output.send(this.getFlash(pads));
	}
	getFlash(pads) {
		return getMsg(TYPE_PAD_FLASH, pads);
	}

	// Send / get MIDI msg to pulse pads.
	// @param pads 		Array(97) of Array(2)[index, color] (incl side led)
	// 					Note: send Note On or SysEx msg to stop pulsing.
	sendPulse(pads) {
		return this.output.send(this.getPulse(pads));
	}
	getPulse(pads) {
		return getMsg(TYPE_PAD_PULSE, pads);
	}

	// Send / get MIDI msg to scroll text.
	// @param data 		Array(3)[color, loop, text] where text is Array() of speeds & chars.
	//                  Note: after each loop, device sends dataless SCROLL_END msg.
	//                  Note: send dataless SCROLL msg to stop scrolling.
	sendScrollText(data) {
		return this.output.send(this.getScrollText(data));
	}
	getScrollText(data) {
		if (Array.isArray(data) && Array.isArray(data[2])) {
			const parsed = [];
			data[2].forEach((item)=>{
				if ('string' === typeof item) {
					let splot = item.split('');
					splot.forEach((char)=>{
						parsed.push( char.charCodeAt(0) );
					});
				} else if ('number' === typeof item) {
					parsed.push(item);
				} else {
					console.error('LP: Invalid character in scroll message.', item);
				}
			});
			data[2] = parsed;
		}
		return getMsg(TYPE_SCROLL, data);
	}

	// Send an all off message.
	sendAllOff(delay = 0) {
		if (!delay) {
			this.sendScrollText([]);
			this.sendAllChange([0]);
		} else {
			this.output.wait(delay).send(this.getScrollText([]));
			this.output.wait(delay + 50).send(this.getAllChange([0]));
		}
	}

	getNoteOn(channel, note, velocity) {
		return JZZ.MIDI.noteOn(channel, note, velocity);
	}
	getNoteOff(channel, note) {
		return JZZ.MIDI.noteOff(channel, note);
	}

	// Send msgs to cycle a pad through colors.
	// data = [channel, note, delay, colors[]]
	sendColorCycle(channel, note, colors = [], delay = 1000, offAtEnd = true) {
		if (offAtEnd && colors.length && colors[colors.length - 1] !== 0) {
			colors[colors.length] = 0;
		}
		colors.forEach((color, i) => {
			const d = delay * i;
			if (!color) {
				this.output.wait(d).send(this.getNoteOff(channel, note));
			} else {
				this.output.wait(d).send(this.getNoteOn(channel, note, color));
			}
		})
	}
};

export default LaunchPad;
