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
	gridState = [[null,0,0,0,0,0,0,0,0,null],
	             [   0,0,0,0,0,0,0,0,0,0   ],
	             [   0,0,0,0,0,0,0,0,0,0   ],
	             [   0,0,0,0,0,0,0,0,0,0   ],
	             [   0,0,0,0,0,0,0,0,0,0   ],
	             [   0,0,0,0,0,0,0,0,0,0   ],
	             [   0,0,0,0,0,0,0,0,0,0   ],
	             [   0,0,0,0,0,0,0,0,0,0   ],
	             [   0,0,0,0,0,0,0,0,0,0   ],
	             [null,0,0,0,0,0,0,0,0,null]];
	palette = [[0,120,121,122,123,124,125,126,127,0],
				[0,112,113,114,115,116,117,118,119,0],
				[0,104,105,106,107,108,109,110,111,0],
				[0, 96, 97, 98, 99,100,101,102,103,0],
				[0, 88, 89, 90, 91, 92, 93, 94, 95,0],
				[0, 80, 81, 82, 83, 84, 85, 86, 87,0],
				[0, 72, 73, 74, 75, 76, 77, 78, 79,0],
				[0, 64, 65, 66, 67, 68, 69, 70, 71,0],
				[0, 56, 57, 58, 59, 60, 61, 62, 63,0],
				[0, 48, 49, 50, 51, 52, 53, 54, 55,0],
				[0, 40, 41, 42, 43, 44, 45, 46, 47,0],
				[0, 32, 33, 34, 35, 36, 37, 38, 39,0],
				[0, 24, 25, 26, 27, 28, 29, 30, 31,0],
				[0, 16, 17, 18, 19, 20, 21, 22, 23,0],
				[0,  8,  9, 10, 11, 12, 13, 14, 15,0],
				[0,  0,  1,  2,  3,  4,  5,  6,  7,0]];

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

		// Set initial grid state, 1-127 = olor, 0 = off
		if (options.gridState) {
			this.sendGridState(options.gridState);
		} else {
			this.sendAllChange([0]);
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
		if ('string' === typeof note) {
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

	//
	// Grid State Helpers
	//

	sendGridState(gridState) {
		const newGrid = [];
		if (gridState.length === 10 && gridState[0].length === 10) {
			gridState.forEach((row, rowIndex) => {
				row.forEach((col, colIndex) => {
					const index = (9 - rowIndex) * 10 + colIndex;
					if ([0, 9, 90].indexOf(index) === -1) {
						if (null===col) return;
						newGrid.push([index, col]);
					}
				});
			});
		}
		if (newGrid.length) {
			this.sendPadChange(newGrid);
		}
	}


	//
	// Color Palatte
	//
	sendPaletteOpen(rowStart=null, current=null) {
		let upArrow = 22;
		let downArrow = 22;
		const leftArrow = 0;
		const rightArrow = 0;

		// palette has 16 rows of 10, where the first and last of each row is 0.
		// when start = 0, rows 0, 1, 2, 3, 4, 5, 6, 7 are displayed
		// when start = 8, rows 8, 9,10,11,12,13,14,15 are displayed
		
		let paletteRowStart = 0; // from 0 to 8.
		if (rowStart !== null && rowStart >= 0 && rowStart <= 8) {
			paletteRowStart = rowStart;
		}

		// when start = 0, down arrow is 0 , else 22 (green)
		// when start = 8, up arrow is 0, else 22 (green)

		if (paletteRowStart === 0) {
			downArrow = 0;
		}
		if (paletteRowStart === 8) {
			upArrow = 0;
		}

		// palette rows [0,1,2,3,4,5,6,7,  8,9,10,11,12,13,14,15];

		const paletteGridState = [
			[null, upArrow, downArrow, leftArrow, rightArrow, 0,0,0,0,null],
			[... this.palette[ paletteRowStart + 7 ]],
			[... this.palette[ paletteRowStart + 6 ]],
			[... this.palette[ paletteRowStart + 5 ]],
			[... this.palette[ paletteRowStart + 4 ]],
			[... this.palette[ paletteRowStart + 3 ]],
			[... this.palette[ paletteRowStart + 2 ]],
			[... this.palette[ paletteRowStart + 1 ]],
			[... this.palette[ paletteRowStart ]],
			[null,0,0,0,0,0,0,0,0,null],
		];

		this.sendGridState(paletteGridState);
	}
	

	/* #############################################################################################################
	 * [ ------ ]#[   91   ]#[   92   ]#[   93   ]#[   94   ]#[   95   ]#[   96   ]#[   97   ]#[   98   ]#[ ------ ]
	 * [ ------ ]#[   up   ]#[   dn   ]#[   lf   ]#[   rt   ]#[ Session]#[  Note  ]#[ Device ]#[  User  ]#[ ------ ]
	 * [  F#7   ]#[   G7   ]#[  G#7   ]#[   A7   ]#[  A#7   ]#[   B7   ]#[   C8   ]#[  C#8   ]#[   D8   ]#[  D#8   ]
	 * #############################################################################################################
	 * [   80   ]#[   81   ]#[   82   ]#[   83   ]#[   84   ]#[   85   ]#[   86   ]#[   87   ]#[   88   ]#[   89   ]
	 * [  Shift ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 * [  G#6   ]#[   A6   ]#[  A#6   ]#[   B6   ]#[   C7   ]#[  C#7   ]#[   D7   ]#[  D#7   ]#[   E7   ]#[   F7   ]
	 * #############################################################################################################
	 * [   70   ]#[   71   ]#[   72   ]#[   73   ]#[   74   ]#[   75   ]#[   76   ]#[   77   ]#[   78   ]#[   79   ]
	 * [  Click ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 * [  A#5   ]#[   B5   ]#[   C6   ]#[  C#6   ]#[   D6   ]#[  D#6   ]#[   E6   ]#[   F6   ]#[  F#6   ]#[   G6   ]
	 * #############################################################################################################
	 * [   60   ]#[   61   ]#[   62   ]#[   63   ]#[   64   ]#[   65   ]#[   66   ]#[   67   ]#[   68   ]#[   69   ]
	 * [  Undo  ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 * [   C5   ]#[  C#5   ]#[   D5   ]#[  D#5   ]#[   E5   ]#[   F5   ]#[  F#5   ]#[   G5   ]#[  G#5   ]#[   A5   ]
	 * #############################################################################################################
	 * [   50   ]#[   51   ]#[   52   ]#[   53   ]#[   54   ]#[   55   ]#[   56   ]#[   57   ]#[   58   ]#[   59   ]
	 * [ Delete ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 * [   D4   ]#[  D#4   ]#[   E4   ]#[   F4   ]#[  F#4   ]#[   G4   ]#[  G#4   ]#[   A4   ]#[  A#4   ]#[   B4   ]
	 * #############################################################################################################
	 * [   40   ]#[   41   ]#[   42   ]#[   43   ]#[   44   ]#[   45   ]#[   46   ]#[   47   ]#[   48   ]#[   49   ]
	 * [ Quantze]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 * [   E3   ]#[   F3   ]#[  F#3   ]#[   G3   ]#[  G#3   ]#[   A3   ]#[  A#3   ]#[   B3   ]#[   C4   ]#[  C#4   ]
	 * #############################################################################################################
	 * [   30   ]#[   31   ]#[   32   ]#[   33   ]#[   34   ]#[   35   ]#[   36   ]#[   37   ]#[   38   ]#[   39   ]
	 * [ Duplic8]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 * [  F#2   ]#[   G2   ]#[  G#2   ]#[   A2   ]#[  A#2   ]#[   B2   ]#[   C3   ]#[  C#3   ]#[   D3   ]#[  D#3   ]
	 * #############################################################################################################
	 * [   20   ]#[   21   ]#[   22   ]#[   23   ]#[   24   ]#[   25   ]#[   26   ]#[   27   ]#[   28   ]#[   29   ]
	 * [ Double ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 * [  G#1   ]#[   A1   ]#[  A#1   ]#[   B1   ]#[   C2   ]#[  C#2   ]#[   D2   ]#[  D#2   ]#[   E2   ]#[   F2   ]
	 * #############################################################################################################
	 * [   10   ]#[   11   ]#[   12   ]#[   13   ]#[   14   ]#[   15   ]#[   16   ]#[   17   ]#[   18   ]#[   19   ]
	 * [    O   ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[        ]#[    >   ]
	 * [  A#0   ]#[   B0   ]#[   C1   ]#[  C#1   ]#[   D1   ]#[  D#1   ]#[   E1   ]#[   F1   ]#[  F#1   ]#[   G1   ]
	 * #############################################################################################################
	 * [ ------ ]#[   1    ]#[   2    ]#[   3    ]#[   4    ]#[   5    ]#[   6    ]#[   7    ]#[   8    ]#[ ------ ]
	 * [ ------ ]#[ Record ]#[ TrkSel ]#[  Mute  ]#[  Solo  ]#[ Volume ]#[   Pan  ]#[  Sends ]#[  Stop  ]#[ ------ ]
	 * [   C0   ]#[  C#0   ]#[   D0   ]#[  D#0   ]#[   E0   ]#[   F0   ]#[  F#0   ]#[   G0   ]#[  G#0   ]#[   A0   ]
	 * #############################################################################################################
	 *                                                   [   99*  ] // with sysex only
	 *                                                   [  Side  ]
	 *                                                   [ ------ ]
	 */
};

export default LaunchPad;
