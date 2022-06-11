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

import { characters } from '../helpers/scrolltext';

/**
 * Novation Launchpad Pro MK2 - JZZ Library
 * @author github.com/wnrosenberg
 *
 * ----------------------------------------
 *
 * @TODO: (In Progress)
 *
 * 	 - Read Input Channels and respond to 
 * 
 *   - Color Palette (sendPaletteOpen(), ...)
 *     > implement widget functionality via pad change messages.
 *
 *   - Scroll Text by Column Change(getScrollTextChange(), ...)
 * 	   > allow text scrolling by column change, which will allow for more creative
 *       scrolling of text than the firmware allows, including color changing text
 *       and aftertouch events.
 *
 * ----------------------------------------
 *
 * @NOTES: 
 *
 * 	 - Grid is stored as rows 0-8 from top to bottom.
 *   - PadIndex starts from the bottom left
 *
 */

class LaunchPad {

	//
	//
	// Instance fields
	//
	//

	// The default port number for input and output.
	// @TODO allow for null input and output in construtor, to use JZZ().openMidiIn() or openMidiOut()
	defaultPort = 1;
	
	// The main input port for the device.
	// @TODO: Update to handle all three inputs.
	input;

	// The main output port for the device.
	// @TODO: Update to handle all three outputs.
	output;

	// The state of the 97 pads.
	// [NOTE] Not all methods that modify the grid update this
	//        so this is treated more as history than a live state.
	//        
	gridState = this.getEmptyGridState();

	// Palette activities alter the grid. This helps to preserve it.
	// Set to null on palette close, and check for null on open/left/right.
	gridBeforePalette = null;

	// Options for the palette.
	palette = {
		open: false,
		color: 1, // currently selected color
		maxColors: 128,
		colStart: 0, // column 0-8 to start the 8x8 display of 16x8 palette
		colorValid: 22, // color for valid controls
		colorInvalid: 6, // color for invalid controls
	};

	// Time of last command, used to determine if command was held down vs pressed.
	paletteOpenAt = 0;

	/**
	 * LaunchPad() - instantiate a new LaunchPad object.
	 * @param options 			Array of options
	 * @param options.input 	Input port (required for listening)
	 * @param options.output 	Output port (required)
	 * @param options.layout 	Set layout mode, default: 3 (programmer)
	 */
	constructor(options=[]) {
		const defaults = {
			layout: 3,
		};
		const getOption = (key) => {
			return options ? ( options[key] ? options[key] : defaults[key]) : defaults[key];
		}

		//
		// Set the input port.
		//
		if (options.input) {
			this.input = options.input;

			// Set up internal listeners.

			// Log messages to the console.
			const inputListener = (msg) => {
				let data = this.parseMidiInput(msg);
				console.log(`Last received MIDI message: ${msg.toString()}`, data);
				this.handleMidiInput(data);
			}
			this.input.connect(inputListener);

		} else {
			console.error("LP: Invalid input port.");
		}

		//
		// Set the output port.
		//
		if (options.output) {
			this.output = options.output;
		} else {
			console.error("LP: Invalid output port.");
		}

		//
		// Set the layout mode.
		//
		let layout = getOption('layout');
		console.log(`Asking device to set layout to ${layout}.`);
		this.output.send(getMsg(TYPE_LAYOUT_SET, layout));

		//
		// Set initial grid state.
		//
		if (options.gridState) {
			this.recallGridState(options.gridState);
		} // else use all 0s


		//
		// Set palette options and colors.
		//

		// Create a 16x8 palette; 0 at top left, 7 at bottom left.
		// (See Figure 3 in the Launchpad Pro MK2 Programmer Ref)
		let paletteGrid = [];
		for (let i = 0; i<16; i++) {
			let row = [];
			for (let j = 0; j<8; j++) {
				row.push(i*8+j);
			}
			paletteGrid.push(row);
		}
		this.palette.colors = this.getTransposedGrid(paletteGrid);
	}



	//
	//
	// Working with Grid State
	//
	//

	// Convert a 10x10 grid state into an array for sendPadChange and send it, updating internal grid.
	// @TODO: Add padding to the grid to convert it to a 10 x 10 for output.
	recallGridState(gridState) {
		const newGrid = [];
		// Check that the dimensions are correct (10x10)
		if (gridState.length === 10 && gridState[0].length === 10) {
			gridState.forEach((row, rowIndex) => {
				row.forEach((col, colIndex) => {
					const index = (9 - rowIndex) * 10 + colIndex;
					if ([0, 9, 90].indexOf(index) === -1) {
						if (col !== '' && col !== null) {
							newGrid.push([index, col]);
						}
					}
				});
			});
		} else {
			// @TODO: Add padding to the grid to convert it to a 10 x 10 for output.
			console.error('Unable to recall grid state with irregular dimensions.');
		}
		// If there is a new grid to change to, perform the action and update the internal grid.
		if (newGrid.length) {
			this.sendPadChange(newGrid);
			this.gridState = gridState;
		}
	}

	// Get a copy of the current grid state.
	getCurrentGridState() {
		return this.gridState.map(row => {return [...row]});
	}

	// Get an empty 10 x 10 grid.
	getEmptyGridState() {
		return [['',0,0,0,0,0,0,0,0,''],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],['',0,0,0,0,0,0,0,0,'']];
	}

	// Get the nth column from a grid as an array.
	getGridColumn(grid, n) {
		const column = [];
		grid.forEach((row) => {
			column.push(row[n]);
		});
		return column;
	}

	// Transpose a grid of any size (convert an array of rows into an array of columns and vice-versa).
	getTransposedGrid(matrix) {
		const rows = matrix.length, cols = matrix[0].length;
		const grid = [];
		for (let j = 0; j < cols; j++) {
			grid[j] = Array(rows);
		}
		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				grid[j][i] = matrix[i][j];
			}
		}
		return grid;
	}


	//
	//
	// Working with Pad State
	//
	//

	// Get a pad's color by index or row and col.
	getCurrentPadState(index, col=0) {
		let row = 0;

		if (!col) {
			row = Math.floor(index/10);
			col = index - (row * 10);
		}

		return this.gridState[row][col];
	}

	// Get a pad's index based on row and col.
	/**
	 * See recallGridState method for this code: 
	 * gridState.forEach((row, rowIndex) => {
				row.forEach((col, colIndex) => {
					const index = (9 - rowIndex) * 10 + colIndex;
		and reverse engineer it lol
	*
	*/
	getPadIndex(row, col) {

	}

	// Get a pad's row and col based on index.
	getPadRowCol(index) {

	}



	//
	//
	// MIDI message Senders & Getters
	//
	//

	// Send / get a MIDI msg to change pad color.
	// @TODO: do param validation (ensure isArray() and proper number of items)
	// @param pads 		Array(97) of Array(2)[index, color] (incl side led)
	sendPadChange(pads) {
		return this.output.send(this.getPadChange(pads));
	}
	getPadChange(pads) {
		return getMsg(TYPE_PAD_COLOR, pads);
	}

	// Send / get a MIDI msg to change column color.
	// @TODO: do param validation (ensure isArray() and proper number of items)
	// @param col 		Array(11) with a column index [0-9] and up to 10 colors.
	//					Note: cols 0 and 9 need placeholders for corners
	sendColChange(col) {
		return this.output.send(this.getColChange(col));
	}
	getColChange(col) {
		col = col.map((item) => {
			if (item === '' || item === null) {
				item = 0;
			}
			return item;
		});
		return getMsg(TYPE_COL_COLOR, col);
	}

	// Send / get a MIDI msg to change row color.
	// @TODO: do param validation (ensure isArray() and proper number of items)
	// @param row 		Array(11) with a row index [0-9] and up to 10 colors.
	//					Note: rows 0 and 9 need placeholders for corners
	sendRowChange(row) {
		return this.output.send(this.getRowChange(row));
	}
	getRowChange(row) {
		row = row.map((item) => {
			if (item === '' || item === null) {
				item = 0;
			}
			return item;
		});
		return getMsg(TYPE_ROW_COLOR, row);
	}

	// Send / get msg to change the entire grid to a color.
	// @TODO: do param validation (ensure isArray() and proper number of items)
	// @param color 	Array(1) with a single color.
	sendAllChange(color) {
		return this.output.send(this.getAllChange(color));
	}
	getAllChange(color) {
		return getMsg(TYPE_GRID_COLOR, color);
	}

	// Send / get MIDI msg to flash pads.
	// @TODO: do param validation (ensure isArray() and proper number of items)
	// @param pads 		Array(97) of Array(2)[index, color] (incl side led)
	// 					Note: send Note On or SysEx msg to stop flashing
	sendFlash(pads) {
		return this.output.send(this.getFlash(pads));
	}
	getFlash(pads) {
		return getMsg(TYPE_PAD_FLASH, pads);
	}

	// @TODO: sendInvalidFlash to send flash using built-in method with flash speed and duration controlled by MIDI clock.
	//        Use this.getCurrentPadState with the index to get initial color.
	//        1 Flash = Set to newcolor, delay, Set to oldcolor.
	//        An invalid flash should be 3 times within a second.
	// sendInvalidFlash(padIndex) or sendInvalidFlash(row, col)
	sendInvalidFlash(index, color, delay = 133) {
		const colors = [this.getCurrentPadState(index), color];
		const flashState = [1,0,1,0,1,0];
		flashState.forEach((state, i) => {
			setTimeout( ()=>{
				this.sendPadChange([index, colors[state]]);
			} , delay * i );
		});
	}

	// Send / get MIDI msg to pulse pads.
	// @TODO: do param validation (ensure isArray() and proper number of items)
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


	// Send an all off message. Stops text scrolling, pad flashing, and pad pulsing.
	sendAllOff(delay = 0) {
		if (!delay) {
			this.sendScrollText([]);
			this.sendAllChange([0]);
		} else {
			this.output.wait(delay).send(this.getScrollText([]));
			this.output.wait(delay + 50).send(this.getAllChange([0]));
		}
	}

	// Get a basic NOTE ON message.
	getNoteOn(channel, note, velocity) {
		return JZZ.MIDI.noteOn(channel, note, velocity);
	}

	// Get a basic NOTE OFF message.
	getNoteOff(channel, note) {
		return JZZ.MIDI.noteOff(channel, note);
	}


	//
	//
	// Working with MIDI messages from Device
	//
	//

	// Handle types of Midi messages from the device.
	handleMidiInput(data) {
		if (data instanceof JZZ().MIDI) {
			data = this.parseMidiInput(data);
		}

		const holdThreshold = 700;
		const allCommands = [
			/**/ 91, 92, 93, 94, 95, 96, 97, 98, /**/
			 80, /** *** *** *** *** *** *** **/ 89,
			 70, /** *** *** *** *** *** *** **/ 79,
			 60, /** *** *** *** *** *** *** **/ 69,
			 50, /** *** *** *** *** *** *** **/ 59,
			 40, /** *** *** *** *** *** *** **/ 49,
			 30, /** *** *** *** *** *** *** **/ 39,
			 20, /** *** *** *** *** *** *** **/ 29,
			 10, /** *** *** *** *** *** *** **/ 19,
			/**/  1,  2,  3,  4,  5,  6,  7,  8, /**/
		];
		const supportedCommands = [
			10, // open palette
		];
		const unsupportedCommands = allCommands.filter((cmd) => supportedCommands.indexOf(cmd) === -1);
		const paletteCommands = [
			10, // close palette
			93, // move palette left
			94, // move palette right
		];
		const unsupportedPaletteCommands = allCommands.filter((cmd) => paletteCommands.indexOf(cmd) === -1);
	
		// data validation
		// if ((typeof data === "object" || typeof data === 'function') && (data !== null)) {
		// 	type = data.type;
		// }

		switch(data.type) {
			case 'layout_select':
				console.log(`Device requested layout change to ${data.data}.`);
				break;
			case 'layout_status':
				console.log(`Device confirmed layout is now set to ${data.data}.`);
				break;
			case 'scroll_end':
				console.log('Device confirmed end of scroll text reached.');
				break;
			case 'command_on':
				// Determine which command by checking data.note
				if (this.isPaletteOpen() && unsupportedPaletteCommands.indexOf(data.note) > -1) {
					this.sendInvalidFlash(data.note, this.palette.colorInvalid);
				}
				if (data.note === 10) {
					this.paletteOpenAt = Date.now();
					if (this.isPaletteOpen()) {
						console.log('User requested palette close.');
						this.sendPaletteClose();
						this.sendPadChange([10, 0]);
					} else {
						console.log('User requested palette open.');
						this.sendPaletteOpen();
						// this.sendPadChange([10, this.palette.colorValid]);
						// After holdThreshold ms, start to pulse bewteen colorValid and 0.
						// setTimeout(()=>{
							this.sendPadChange([10, 0]);
							this.sendFlash([10, this.palette.colorValid]);
						// }, holdThreshold);
					}
				} else if (data.note === 93) {
					if (this.isPaletteOpen()) {
						console.log('User requested palette move left.');
						this.sendPaletteLeft();
					}
				} else if (data.note === 94) {
					if (this.isPaletteOpen()) {
						console.log('User requested palette move right.');
						this.sendPaletteRight();
					}
				} else {
					console.log(`User requested unrecognized command_on.`);
				}
				break;
			case 'command_off':
				// Determine which command by checking data.note
				if (data.note === 10) {
					if (this.isPaletteOpen()) {
						console.log('User requested palette close via command_off.');

						// Check the time since the corresponding command_on was triggered.
						let diff = Date.now() - this.paletteOpenAt;
						console.log(`Diff was ${diff}`);

						if (diff > holdThreshold) {
							console.log(`Off followed more than a second later, so assume it was held, so we will close the palette.`);
							this.sendPaletteClose();
							this.sendPadChange([10, 0]);
						} else {
							console.log(`Off followed less than a second later, so assume it was a press, so we will leave it open.`);
						}
					}
				} else {
					console.log(`User requested unrecognized command_off.`);
				}
				break;
			default:
				console.log(`Message of unsupported type: ${data.type}.`)
				break;
		}
	}

	// Parse a message of type JZZ.MIDI
	parseMidiInput(message) {
		// console.log('parseMidiInput is attempting to parse the message: ', message);
		const data = {
			type: 'unrecognized', // [layout_select, layout_status, @TODO others]
			sysex: false,
			note: null,
			data: [], // data bytes, for sysex messages
			bytes: [], // list 2-digit hex characters
			decimals: [], // bytes but after parseInt(x,'16')
		};

		let bytes = message.toString().toUpperCase().split(' ');
		data.bytes = bytes;
		// console.log('hex bytes:', bytes);

		let decimals = bytes.map((byte) => parseInt(byte, '16'));
		data.decimals = decimals;
		// console.log('dec bytes:', decimals);


		// Validation start.
		if (message.isNoteOn()) {
			data.type = 'note_on';
			data.note = message.getNote();
			data.velocity = decimals[2];
		} else if (message.isNoteOff()) {
			data.type = 'note_off';
			data.note = message.getNote();
			data.velocity = decimals[2];
		} else if (decimals[0] === 176) {
			data.type = 'command';
			data.note = decimals[1];
			if (decimals[2] === 0) {
				data.type = 'command_off';
			}
			if (decimals[2] === 127) {
				data.type = 'command_on';
			}
		} else if (message.isFullSysEx()) {
			data.sysex = true;
			data.type = 'sysex_full';

			// All sysex start with (240,0,32,41,2,16) and end with (247) according to reference.
			if (decimals[0] === 240
				&& decimals[1] === 0
				&& decimals[2] === 32
				&& decimals[3] === 41
				&& decimals[4] === 2
				&& decimals[5] === 16
				&& decimals[decimals.length - 1] === 247) {
				
				// This is a full sysex message specifically from our device.
				switch(decimals[6]) {
					case 44: // hex: 2C
						data.type = 'layout_select';
						data.data = decimals[7];
						break;
					case 47: // hex 2F
						data.type = 'layout_status';
						data.data = decimals[7];
						break;
					case 21: // hex: 15
						data.type = 'scroll_end';
						break;
					default:
						data.type = 'sysex_device';
						break;
				}
			}
		} else if (message.isSysEx()) {
			data.sysex = true;
			data.type = 'sysex';
		}
		
		return data;
	}


	//
	//
	// Basic animations using note on/off and sysex.
	//
	//

	// Send msgs to cycle a pad through colors.
	// data = [channel, note, delay, colors[]]
	sendColorCycle(channel, note, colors = [], delay = 1000, offAtEnd = true) {
		if (offAtEnd && colors.length && colors[colors.length - 1] !== 0) {
			colors[colors.length] = 0;
		}
		if (typeof note === 'string') {
			note = JZZ.MIDI.midi(note);
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

	// Send msgs to cycle a pad through colors (via SysEx)
	sendColorCycleSysEx(note, colors = [], delay = 1000, offAtEnd = true) {
		if (offAtEnd && colors.length && colors[colors.length - 1] !== 0) {
			colors[colors.length] = 0;
		}
		colors.forEach((color, i) => {
			const d = delay * i;
			this.output.wait(d).send(this.getPadChange([note, color]));
		})
	}

	// Scroll text using column change / pad change messages.
	// options = {preserveContent, revealContent, loop, delay}
	// @TODO: Use padChange instead of colChange to reduce calls.
	sendScrollTextChange(options=null) {
		const defaults = {
			text: 'Hello World!',
			delay: 100,
			color: 1,
			loop: 0,
			preserveContent: true,
			revealContent: true,
			startsAt: 0,
		};

		const getOption = (key) => {
			return options ? ( options[key] ? options[key] : defaults[key]) : defaults[key];
		}

		// -- Initialize!

		// The text that we're going to scroll (default: 'Hello World!')
		const text = getOption('text');

		// Set the delay between column output calls in ms (default: 100ms)
		const delay = getOption('delay');

		// Set the color to be displayed when we output (default: 55)
		let color = getOption('color');

		// Number of times to loop after scrolling once (default: 0)
		let loop = getOption('loop');

		// Whether to return to the previous grid (true) or display blank (default: false)
		const preserveContent = getOption('preserveContent');
		
		// Whether to reveal gridOnComplete (true) or just display it (default: false)
		const revealContent = getOption('revealContent');

		// Delay to start of animation (default: 0)
		const startsAt = getOption('startsAt'); // isnt working

		// The grid to show when animation is complete.
		let gridOnComplete = []; // grid to show when complete.
		if (preserveContent) {
			gridOnComplete = this.getCurrentGridState();
		} else {
			gridOnComplete = this.getEmptyGridState();
		}

		// The allowed characters that we can output.
		const allowed = Object.keys(characters);

		// The message text.
		let message = '';

		// Filter the text argument by the allowed letters.
		message = [...text].reduce((msg, letter) => {
			if (allowed.indexOf(letter) > -1) {
				return `${msg}${letter}`;
			} else {
				return msg;
			}
		}, '');

		// The last character in the message.
		const lastLetter = message.charAt(message.length - 1);

		// A single character in the message.
		let letter = '';

		// The pads that this character represents.
		let charPads = [[],[],[],[],[],[],[],[]];

		// The pads for the full message.
		const output = [[],[],[],[],[],[],[],[]];

		// Object that stores the col change messages indexed by delay amount.
		const colsByDelay = {};

		// The length of a row or column.
		const deviceSize = 10;


		// -- Build the output pattern!

		// For each letter in the message.
		for (var i = 0; i < message.length; i++) {
  			letter = message.charAt(i);
  			// Get the grid for this letter.
			charPads = characters[letter];
			// And append each row of it to the output.
			output.forEach((row, i) => {
				output[i] = [...row, ...charPads[i]];
			});
		};

		// If revealContent is off, then we need to pad the end of the message with empty
		// pads before gridOnComplete is displayed, whether preserveContent is on or not.
		// @TODO: Find a more exact way to determine number of pad columns needed.
		if (!revealContent) {
			output.forEach((row) => {
				// If the message ends with punctuation, use less space.
				if ([':', ';', '.', ',', ' '].indexOf(lastLetter) > -1) {
					row.push(0,0,0,0,0,0,0); // extra 7 pads
				} else {
					row.push(0,0,0,0,0,0,0,0,0); // extra 9 pads
				}
				return row;
			});
		}
		// console.log('rows to output', output);


		// -- Define timing!

		// @TODO: Use the MIDI clock feature of JZZ to do this.
		// For now we're gonna use setTimeout.

		// The length of one message row.
		const msgLen = output[0].length;
		// console.log('message length: ', msgLen);

		// First column is output on right side at time = startsAt.

		// Last column is output on right side at time = msgDuration.
		// If there was padding, then this is the time at which the screen is empty.
		const msgDuration = startsAt + (msgLen - 1) * delay;
		// console.log('message duration: ', msgDuration);

		// The total duration for the animation including delay after final scroll.
		// When revealContent is on, this time is increased by revealing the grid.
		let totalDuration = msgDuration + delay;
		// console.log('total duration (initial): ', totalDuration);

		

		// -- Output the messages by column!

		// For each column in the output...
		for (let i = 0; i < msgLen; i++) {

			// Calculate whether there are any filled in pads in this column,
			// and if not, don't increment the color.

			let colTotal = 0;

			for (let j = 0; j < 8; j++) {
				if (output[j][i] === 1) {
					colTotal++;
				}
			}

			const useRainbowText = true;
			const rainbowPattern = 'all_columns';
			const rainbowPalette = 'default';
			const supportedRainbowPatterns = ['all_columns'];

			if (useRainbowText) {
				if (rainbowPalette === 'default') {
					// use the default 1-127 color palette
				} else {
					// @TODO: Check if the name matches an existing custom color palette and then use that.
				}

				if (rainbowPattern === 'all_columns') {
					// Increase color by 1, but not more than 126, then add one.
					// Should allow for full range of colors 1-127 without 0.
					if (colTotal > 0) {
						color = (color + 1) % 126 + 2;
					}
				} else if (rainbowPattern === 'no_empty_columns') {
					// @TODO: Check if this column contains any [1]s before incrementing the color.
				}
			}
			

			// Initialize the column array.
			let columnPads = [];

			// The height of a column is the length of the output.
			const columnHeight = output.length;

			// Add top and bottom padding if height isnt 10.
			const addColPadding = columnHeight !== deviceSize;

			// Collect the pads into the array.
			for (let j = 0; j < columnHeight; j++) {
				if (j === 0 && addColPadding) {
					columnPads.push(0);
				}
				columnPads.push(output[j][i] * color);
				if (j === columnHeight-1 && addColPadding) {
					columnPads.push(0);
				}
			}

			// Row numbers start from bottom, so reverse the order here.
			columnPads = columnPads.reverse();

			// Send the array to each of the columns with a delay.

			// Start scroll from right side (column = 9) and finish on left side (column = 0)

			let colsToScroll = deviceSize - 1; // a max of 9 scrolls before its off the grid.

			// The last 9 columns of the message do not scroll completely.
			if (i === msgLen - 1) colsToScroll = 0; // The last column scrolls 0 positions.
			if (i === msgLen - 2) colsToScroll = 1;
			if (i === msgLen - 3) colsToScroll = 2;
			if (i === msgLen - 4) colsToScroll = 3;
			if (i === msgLen - 5) colsToScroll = 4;
			if (i === msgLen - 6) colsToScroll = 5;
			if (i === msgLen - 7) colsToScroll = 6;
			if (i === msgLen - 8) colsToScroll = 7;
			if (i === msgLen - 9) colsToScroll = 8;

			// Fill colsByDelay array with the column change messages arranged by delay time.
			for (let k = 0; k <= colsToScroll; k++) {
				// delay * k + delay * i
				let calcDelay = delay * (k + i);

				// Set the array for this calcDelay if not exists.
				if (Object.keys(colsByDelay).indexOf(`${calcDelay}`) === -1) {
					colsByDelay[`${calcDelay}`] = [];
				}

				// Add the change column message to the array for this calcDelay.
				colsByDelay[`${calcDelay}`].push( this.getColChange([9 - k, ...columnPads]) );
			}
			// console.log('colsByDelay: ', colsByDelay);
		}


		// Now that we have an array containing col change messages indexed by delay, we can execute it.
		Object.keys(colsByDelay).forEach((key) => {
			setTimeout(()=>{
				colsByDelay[key].forEach((message) => {
					// console.log(`sending message `, message , `at time = ${key}`);
					this.output.send(message);
					// this.sendColChange(message); // is supposed to send data not message
				});
			}, key);
		}); 


		// -- Reveal the final grid or just display it!

		// If we are revealing the gridOnComplete column by column:
		if (revealContent) {

			// Convert the grid (array of rows) to an array of columns.
			let colsOnComplete = this.getTransposedGrid(gridOnComplete);

			// Start displaying each column starting from the left, at t = msgDuration + delay.
			for (let l = 0; l < deviceSize; l++) {
				setTimeout(() => {
					// Get the column data.
					let columnPads = [...colsOnComplete[9 - l]];
					// Remember that rows are ordered from bottom to top.
					columnPads.reverse();
					// Output in the correct order.
					return this.sendColChange([9 - l, ...columnPads ]);
				}, msgDuration + delay * (l + 1));	
			}

			// Next animation can happen on msgDuration + delay * 11.
			totalDuration = msgDuration + delay * 11;
			// console.log('message duration (after revealing): ', totalDuration);

		} else {

			if (!loop) {
				// Recall the grid in one step.
				setTimeout(() => {
					return this.recallGridState(gridOnComplete);
				}, msgDuration + delay);
				totalDuration = msgDuration + delay * 2;
			} else {
				totalDuration = msgDuration + delay;
			}
		}

		// return the total duration of the animation so other methods can chain after this one.

		if (loop > 0) {
			setTimeout(()=>{
				return this.sendScrollTextChange({
					text: text,
					delay: delay,
					loop: --loop,
					preserveContent: preserveContent,
					revealContent: revealContent,
				});
			}, totalDuration);
		}
		return totalDuration;

	}


	//
	//
	// Working with the Color Palette
	//
	//

	isPaletteOpen() {
		return this.palette.open;
	}

	// Get a 10x10 grid state containing the current slice of the palette.
	// Pass in arrow state [up,down,left,right] and paletteColStart
	getPaletteGridState(arrow, start) {
		return [
			[null, arrow.up, arrow.down, arrow.left, arrow.right, 0,0,0,0,null],
			[0   , ...this.palette.colors[0].slice(start, start+8), 0],
			[0   , ...this.palette.colors[1].slice(start, start+8), 0],
			[0   , ...this.palette.colors[2].slice(start, start+8), 0],
			[0   , ...this.palette.colors[3].slice(start, start+8), 0],
			[0   , ...this.palette.colors[4].slice(start, start+8), 0],
			[0   , ...this.palette.colors[5].slice(start, start+8), 0],
			[0   , ...this.palette.colors[6].slice(start, start+8), 0],
			[0   , ...this.palette.colors[7].slice(start, start+8), 0],
			[null,0,0,0,0,0,0,0,0,null]
		]; 
	}


	// Open the palette so that a color can be chosen.
	// Used with left and right palette navigation.
	// Palette has 8 rows of 16, as in Figure 3 from the
	// programming reference, so we'll use the square pads.
	// We will use the left and right arrows to navigate.
	// Rows of 16 means that only 8 can be displayed at one time.
	sendPaletteOpen(colStart=null, current=null) {

		// Check whether the palette is open yet...
		if (!this.palette.open) {

			// And if it isn't save the grid state.
			this.gridBeforePalette = this.getCurrentGridState();	
		}

		// Get the index of the left-most visible column.
		let paletteColStart = this.palette.colStart;

		// If we are given an index to start from let's use that instead.
		if (colStart !== null && colStart >= 0 && colStart <= 8) {
			paletteColStart = colStart;
		}

		// Define the arrows for this control.
		const arrows = {
			up: 0,
			down: 0,
			left: this.palette.colorValid,
			right: this.palette.colorValid,
		};
		
		// If we're at the left side, we can't go left more.
		if (paletteColStart === 0) {
			arrows.left = 0;
		}

		// If we're at the right side, we can't go right more.
		if (paletteColStart === 8) {
			arrows.right = 0;
		}

		// Draw this grid state.
		this.recallGridState(this.getPaletteGridState(arrows, paletteColStart));

		// Set palette to open.
		this.palette.open = true;

		// Store the current colStart.
		this.palette.colStart = paletteColStart;

		// @TODO: If the currently selected color is visible in the palette grid,
		//        then set its pad to pulse its color to indicate selection.
		//        Use this.palette.color unless arg current is provided.
	}

	sendPaletteLeft() {
		const padIndex = 93;
		if (!this.palette.open) {
			return false;
		}
		if (this.palette.colStart === 0) {
			// @TODO: Quickly flash the pad red a few times to indicate invalid action.
			this.sendInvalidFlash(padIndex, this.palette.colorInvalid);
			// this.sendFlash([padIndex, this.palette.colorInvalid]);
			// setTimeout(()=>{
			// 	this.sendFlash([padIndex, 0]);
			// }, 1000);
			return false;
		}
		return this.sendPaletteOpen(this.palette.colStart - 1);
	}

	sendPaletteRight() {
		const padIndex = 94;
		if (!this.palette.open) {
			return false;
		}
		if (this.palette.colStart === 8) {
			// @TODO: Quickly flash the pad red a few times to indicate invalid action.
			this.sendInvalidFlash(padIndex, this.palette.colorInvalid);
			// this.sendFlash([padIndex, this.palette.colorInvalid]);
			// setTimeout(()=>{
			// 	this.sendFlash([padIndex, 0]);
			// }, 1000);
			return false;
		}
		return this.sendPaletteOpen(this.palette.colStart + 1);
	}

	// @TODO: Handle color selection. Possibly only while palette is open.
	// selectPaletteColor(color) {}

	sendPaletteClose() {
		if (!this.palette.open) {
			return false;
		}

		this.recallGridState(this.gridBeforePalette);
		this.palette.open = false;
		this.gridBeforePalette = null;
	}

	/*   #############################################################################################################
	 *   [ ------ ]#[   91   ]#[   92   ]#[   93   ]#[   94   ]#[   95   ]#[   96   ]#[   97   ]#[   98   ]#[ ------ ]
	 * 9 [ ------ ]#[   up   ]#[   dn   ]#[   lf   ]#[   rt   ]#[ Session]#[  Note  ]#[ Device ]#[  User  ]#[ ------ ]
	 *   [  F#7   ]#[   G7   ]#[  G#7   ]#[   A7   ]#[  A#7   ]#[   B7   ]#[   C8   ]#[  C#8   ]#[   D8   ]#[  D#8   ]
	 *   #############################################################################################################
	 *   [   80   ]#[   81   ]#[   82   ]#[   83   ]#[   84   ]#[   85   ]#[   86   ]#[   87   ]#[   88   ]#[   89   ]
	 * 8 [  Shift ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 *   [  G#6   ]#[   A6   ]#[  A#6   ]#[   B6   ]#[   C7   ]#[  C#7   ]#[   D7   ]#[  D#7   ]#[   E7   ]#[   F7   ]
	 *   #############################################################################################################
	 *   [   70   ]#[   71   ]#[   72   ]#[   73   ]#[   74   ]#[   75   ]#[   76   ]#[   77   ]#[   78   ]#[   79   ]
	 * 7 [  Click ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 *   [  A#5   ]#[   B5   ]#[   C6   ]#[  C#6   ]#[   D6   ]#[  D#6   ]#[   E6   ]#[   F6   ]#[  F#6   ]#[   G6   ]
	 *   #############################################################################################################
	 *   [   60   ]#[   61   ]#[   62   ]#[   63   ]#[   64   ]#[   65   ]#[   66   ]#[   67   ]#[   68   ]#[   69   ]
	 * 6 [  Undo  ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 *   [   C5   ]#[  C#5   ]#[   D5   ]#[  D#5   ]#[   E5   ]#[   F5   ]#[  F#5   ]#[   G5   ]#[  G#5   ]#[   A5   ]
	 *   #############################################################################################################
	 *   [   50   ]#[   51   ]#[   52   ]#[   53   ]#[   54   ]#[   55   ]#[   56   ]#[   57   ]#[   58   ]#[   59   ]
	 * 5 [ Delete ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 *   [   D4   ]#[  D#4   ]#[   E4   ]#[   F4   ]#[  F#4   ]#[   G4   ]#[  G#4   ]#[   A4   ]#[  A#4   ]#[   B4   ]
	 *   #############################################################################################################
	 *   [   40   ]#[   41   ]#[   42   ]#[   43   ]#[   44   ]#[   45   ]#[   46   ]#[   47   ]#[   48   ]#[   49   ]
	 * 4 [ Quantze]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 *   [   E3   ]#[   F3   ]#[  F#3   ]#[   G3   ]#[  G#3   ]#[   A3   ]#[  A#3   ]#[   B3   ]#[   C4   ]#[  C#4   ]
	 *   #############################################################################################################
	 *   [   30   ]#[   31   ]#[   32   ]#[   33   ]#[   34   ]#[   35   ]#[   36   ]#[   37   ]#[   38   ]#[   39   ]
	 * 3 [ Duplic8]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 *   [  F#2   ]#[   G2   ]#[  G#2   ]#[   A2   ]#[  A#2   ]#[   B2   ]#[   C3   ]#[  C#3   ]#[   D3   ]#[  D#3   ]
	 *   #############################################################################################################
	 *   [   20   ]#[   21   ]#[   22   ]#[   23   ]#[   24   ]#[   25   ]#[   26   ]#[   27   ]#[   28   ]#[   29   ]
	 * 2 [ Double ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 *   [  G#1   ]#[   A1   ]#[  A#1   ]#[   B1   ]#[   C2   ]#[  C#2   ]#[   D2   ]#[  D#2   ]#[   E2   ]#[   F2   ]
	 *   #############################################################################################################
	 *   [   10   ]#[   11   ]#[   12   ]#[   13   ]#[   14   ]#[   15   ]#[   16   ]#[   17   ]#[   18   ]#[   19   ]
	 * 1 [    O   ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 *   [  A#0   ]#[   B0   ]#[   C1   ]#[  C#1   ]#[   D1   ]#[  D#1   ]#[   E1   ]#[   F1   ]#[  F#1   ]#[   G1   ]
	 *   #############################################################################################################
	 *   [ ------ ]#[   1    ]#[   2    ]#[   3    ]#[   4    ]#[   5    ]#[   6    ]#[   7    ]#[   8    ]#[ ------ ]
	 * 0 [ ------ ]#[ Record ]#[ TrkSel ]#[  Mute  ]#[  Solo  ]#[ Volume ]#[   Pan  ]#[  Sends ]#[  Stop  ]#[ ------ ]
	 *   [   C0   ]#[  C#0   ]#[   D0   ]#[  D#0   ]#[   E0   ]#[   F0   ]#[  F#0   ]#[   G0   ]#[  G#0   ]#[   A0   ]
	 *   #############################################################################################################
	 *        0          1          2          3          4          5          6          7          8          9
	 *                                                   [   99*  ] // with sysex only
	 *                                                   [  Side  ]
	 *                                                   [ ------ ]
	 */
};

export default LaunchPad;
