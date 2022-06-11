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
		gridState: [['', 0, 0, 0, 0, 0, 0, 0, 0,''],
								[0,36, 0, 0,36, 0, 0,36, 0,0],
								[0,36, 1, 0,36, 1, 0, 0, 1,0],
								[0,36, 1, 0,36, 1, 0, 0, 0,0],
								[0,36,36,36,36, 1, 0,36, 0,0],
								[0,36, 1, 1,36, 1, 0,36, 1,0],
								[0,36, 1, 0,36, 1, 0,36, 1,0],
								[0,36, 1, 0,36, 1, 0,36, 1,0],
								[0, 0, 1, 0, 0, 1, 0, 0, 1,0],
								['', 0, 0, 0, 0, 0, 0, 0, 0,'']],								
	});




	/////////////////////

	// Set a background color
	// _LP.sendAllChange([100]);

	// Scroll a message
	// _LP.sendScrollText([45,100,[0x04, 'In the mix with DJ PupStar!  ',0x06,' MONDAY NIGHT DISCO! ']]);

	_LP.sendScrollTextChange({text:'Monday Night Disco  #  In the mix with DJ PupStar  #  twitch.tv/jaypuppy42', loop: 1000, delay: 90});	

	// // Attach scroll text event to the button.
	// const scrollStartButton = document.querySelector('button#scrollstart');
	// if (scrollStartButton) scrollStartButton.addEventListener('click', (e) => {
	// 	return _LP.sendScrollTextChange({text:'Hello World!', delay: 200});	
	// });

	// // Attack palette toggle buttn to controls.
	// const paletteToggleButton = document.querySelector('button#togglePaletteOpen');
	// if (paletteToggleButton) paletteToggleButton.addEventListener('click', (e) => {
	// 	if (!_LP.isPaletteOpen()) {
	// 		return _LP.sendPaletteOpen();
	// 	} else {
	// 		return _LP.sendPaletteClose();
	// 	}
	// });
	// const paletteLeftButton = document.querySelector('button#togglePaletteLeft');
	// if (paletteLeftButton) paletteLeftButton.addEventListener('click', (e) => {
	// 	return _LP.sendPaletteLeft();
	// });
	// const paletteRightButton = document.querySelector('button#togglePaletteRight');
	// if (paletteRightButton) paletteRightButton.addEventListener('click', (e) => {
	// 	return _LP.sendPaletteRight();
	// });

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
// const logInputs = () => {
// 	let input;
// 	const inputLogger = (msg, i) => {
// 		let index = i !== undefined ? `[${i}]` : '';
// 		console.log(`msg${index}: ${msg.toString()}`);
// 	}
// 	for (let i = 0; i < JZZ().info().inputs.length; i++) {
// 		input = JZZ().openMidiIn(i);
// 		input.connect(inputLogger);
// 	}
// };

//////////////////////////////

// Init the JZZ plugin and trigger app init
const initJazz = function() {
	JZZ({sysex: true}).or('Cannot start MIDI engine!').and(function(){
		console.log('JZZ initialized', JZZ().info());
		// logInputs(); // now handled in Launchpad class.
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