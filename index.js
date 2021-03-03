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
} from './helpers/message';

////////////////////////////////

let inputPort = null;
let outputPort = null;

// Messages using velocity-based colors from 0 to 127

// Get a MIDI msg for updating pad colors.
const getPadChangeMsg = function(pads) {
	return getMsg(TYPE_PAD_COLOR, pads);
};

const getColChangeMsg = function(col) {
	return getMsg(TYPE_COL_COLOR, col);
};

const getRowChangeMsg = function(row) {
	return getMsg(TYPE_ROW_COLOR, row);
};

const getAllChangeMsg = function(color) {
	return getMsg(TYPE_GRID_COLOR, color);
};

const getFlashMessage = function(pads) {
	return getMsg(TYPE_PAD_FLASH, pads);
}

const getPulseMessage = function(pads) {
	return getMsg(TYPE_PAD_PULSE, pads);
}

// getScrollingMessage([ color, loop, content ]);
// Uses built-in text scroll SysEx message. No background.
//   color:   (1 .. 127)
//   loop:    true/false
//   content: array of strings and speed markers (0x01 .. 0x07)
const getScrollingMessage = function(data) {
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
				console.log('item is another type', item);
			}
		});
		data[2] = parsed;
	}

	return getMsg(TYPE_SCROLL, data);
}


// Connect the refresh button an action
// document.getElementById('refresh').addEventListener('click',function(){refreshJazz()});

const inputLogger = (msg, i) => {
	let index = i !== undefined ? `[${i}]` : '';
	console.log(`msg${index}: ${msg.toString()}`);
}

const logInputs = () => {
	let input;
	for (let i = 0; i < JZZ().info().inputs.length; i++) {
		input = JZZ().openMidiIn(i);
		input.connect(inputLogger);
	}
};

// Init the app after JZZ is refreshed
const initApp = function() {
	console.log('initApp started');

	// Assign the port that we'll use for the output.
	outputPort = JZZ().openMidiOut(1);
	
	// ----------------

	// // Set a background color
	// outputPort.send(getAllChangeMsg([100]));



	// Set to programmer layout if it isn't already.
	// outputPort.send(getMsg(TYPE_MODE_SET, 1));
	outputPort.send(getMsg(TYPE_LAYOUT_SET, 3));

	// Scroll a message
	// outputPort.send(getScrollingMessage([
	// 	6, // color [0 (off), 1 .. 127]
	// 	0, // loop yes/no
	// 	[0x04, 'Hello', 0x06, 'District!'] // Strings and Speed Characters [0x01 .. 0x07]
	// ]));

	// // Test note on, note off, and change velocity midi commands.
	// let channel = 0;
	// let note = 'C4'; //60; // C5
	// let velocity = 100;
	// let midiOn = JZZ.MIDI.noteOn(channel, note, velocity);
	// let midiOff = JZZ.MIDI.noteOff(channel, note);
	// let midiVel = [
	// 	JZZ.MIDI.noteOn(channel, note, 6), // 0x00 to 0x7f
	// 	JZZ.MIDI.noteOn(channel, note, 12), // 0x00 to 0x7f
	// 	JZZ.MIDI.noteOn(channel, note, 17), // 0x00 to 0x7f
	// 	JZZ.MIDI.noteOn(channel, note, 24), // 0x00 to 0x7f
	// ];

	// outputPort.send(midiOn).wait(1000)
	// 		  .send(midiVel[0]).wait(1000)
	// 		  .send(midiVel[1]).wait(1000)
	// 		  .send(midiVel[2]).wait(1000)
	// 		  .send(midiVel[3]).wait(1000)
	// 		  .send(midiOff);


	// After 10s turn off the pads.
	
	outputPort.wait(10000).send(getScrollingMessage([]));
	outputPort.wait(10300).send(getAllChangeMsg([0]));

};

////////////////////////////////

// Refresh the JZZ plugin after connect/disconnect of midi gear
const refreshJazz = function() {
	console.log('Refresh btn clicked.');
	JZZ().refresh().then(function(){
		console.log('JZZ Refreshed: ', JZZ().info());
		logInputs(); // console.log all input port messages
		initApp();
	});
};

//////////////////////////////

// Init the JZZ plugin and trigger app init
const initJazz = function() {
	JZZ({sysex: true}).or('Cannot start MIDI engine!').and(function(){
		console.log('JZZ initialized', JZZ().info());
		logInputs(); // console.log all input port messages
		initApp();
	})
};

///////////////////////////////

// init on domready and lets goooooooooooo
document.onreadystatechange = function () {
  if (document.readyState === 'complete') {
    initJazz();
  }
}