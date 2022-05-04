import JZZ from 'jzz';
import LaunchPad from './class/LaunchPad';

// Connect the refresh button an action
// document.getElementById('refresh').addEventListener('click',function(){refreshJazz()});

//////////////////////////

// Settings
const default_port = 1;

// LaunchPad object.
let _LP = null; // LaunchPad object.

//////////////////////////

// Init the app after JZZ is refreshed
const initApp = function() {
	console.log('initApp started');

	// Instantiate a new LaunchPad object, setting its ports.
	_LP = new LaunchPad({
		input: JZZ().openMidiIn(default_port),
		output: JZZ().openMidiOut(default_port),
		gridState: [[0, 0, 0, 0, 0, 0, 0, 0, 0,0],
								[0,36, 0, 0,36, 0, 0,36, 0,0],
								[0,36, 1, 0,36, 1, 0, 0, 1,0],
								[0,36, 1, 0,36, 1, 0, 0, 0,0],
								[0,36,36,36,36, 1, 0,36, 0,0],
								[0,36, 1, 1,36, 1, 0,36, 1,0],
								[0,36, 1, 0,36, 1, 0,36, 1,0],
								[0,36, 1, 0,36, 1, 0,36, 1,0],
								[0, 0, 1, 0, 0, 1, 0, 0, 1,0],
								[0, 0, 0, 0, 0, 0, 0, 0, 0,0]],
	});

	/////////////////////

	// Set a background color
	// _LP.sendAllChange([100]);

	// Scroll a message
	// _LP.sendScrollText([6,0,[0x04, 'Hello', 0x06, 'District!']]);
	_LP.sendScrollText([45,100,[0x04, 'In the mix with DJ PupStar!  ',0x06,'   Follower Goal: 80/100    ']]);


	// Cycle a pad between colors, by default will noteOff at end unless 5th param = false
	// _LP.sendColorCycle(0, 83, [100, 6, 12, 17, 24]);
	// _LP.sendColorCycleSysEx(99, [100, 6, 12, 17, 24], 1000, false);

	// After 10s turn off the pads.
	// _LP.sendAllOff(10000);

};

////////////////////////////////

// Refresh the JZZ plugin after connect/disconnect of midi gear
// const refreshJazz = function() {
// 	console.log('Refresh btn clicked.');
// 	JZZ().refresh().then(function(){
// 		console.log('JZZ Refreshed: ', JZZ().info());
// 		logInputs(); // console.log all input port messages
// 		initApp();
// 	});
// };

//////////////////////////////

// Connect logging to JZZ inputs.
const logInputs = () => {
	let input;
	const inputLogger = (msg, i) => {
		let index = i !== undefined ? `[${i}]` : '';
		console.log(`msg${index}: ${msg.toString()}`);
	}
	for (let i = 0; i < JZZ().info().inputs.length; i++) {
		input = JZZ().openMidiIn(i);
		input.connect(inputLogger);
	}
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