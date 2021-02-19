import JZZ from 'jzz';

////////////////////////////////

let outputPort = null;

// Init the app after JZZ is refreshed
const initApp = function() {
	
	// Connect the refresh button an action
	document.getElementById('refresh').addEventListener('click',function(){refreshJazz()});

	// Assign the port that we'll use for the ouput.
	outputPort = JZZ().openMidiOut(1);

	// try some sysex magic and print response
	let message = JZZ.MIDI([
		0xf0, 0x00, 0x20, 0x29, 0x02, 0x10, 0x0a, // sysex to adjust LEDs
		0x63, 6, // led index, color
		0xf7 // sysex terminator
	]);
	let response = outputPort.send(message);
	console.log('Sent MIDI message', message, 'and got response', response);

};

////////////////////////////////

// Refresh the JZZ plugin after connect/disconnect of midi gear
const refreshJazz = function() {
	console.log('Refresh btn clicked.');
	JZZ().refresh().then(function(){
		console.log('JZZ Refreshed: ', JZZ().info());
		initApp();
	});
};

//////////////////////////////

// Init the JZZ plugin and trigger app init
const initJazz = function() {
	JZZ({sysex: true}).or('Cannot start MIDI engine!').and(function(){
		console.log('JZZ initialized', JZZ().info());
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