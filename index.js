import JZZ from 'jzz';

////////////////////////////////

let outputPort = null;

// Get a MIDI msg for updating pad colors.
const getPadChangeMsg = function(pads) {
	const header = [0xf0, 0x00, 0x20, 0x29, 0x02, 0x10, 0x0a];
	let padData = [];
	const terminator = [0xf7];
	pads.forEach((pad, i)=>{
		padData.push(...pad);
	});
	return JZZ.MIDI([...header, ...padData, ...terminator]);
};

const getColChangeMsg = function(col) {
	const header = [0xf0, 0x00, 0x20, 0x29, 0x02, 0x10, 0x0c];
	let padData = [];
	const terminator = [0xf7];

	// if pads is an array of pads, do a forEach.
	// if (pads.length && 'object' === typeof pads[0]) {
	// 	pads.forEach((pad, i)=>{
	// 		padData.push(...pad);
	// 	});
	// } else {
		padData.push(...col);
	// }
	return JZZ.MIDI([...header, ...padData, ...terminator]);
};

const getRowChangeMsg = function(col) {
	const header = [0xf0, 0x00, 0x20, 0x29, 0x02, 0x10, 0x0d];
	let padData = [];
	const terminator = [0xf7];

	// if pads is an array of pads, do a forEach.
	// if (pads.length && 'object' === typeof pads[0]) {
	// 	pads.forEach((pad, i)=>{
	// 		padData.push(...pad);
	// 	});
	// } else {
		padData.push(...col);
	// }
	return JZZ.MIDI([...header, ...padData, ...terminator]);
};

const getAllChangeMsg = function(color) {
	const header = [0xf0, 0x00, 0x20, 0x29, 0x02, 0x10, 0x0e];
	const terminator = [0xf7];
	return JZZ.MIDI([...header, ...color, ...terminator]);
};


// Init the app after JZZ is refreshed
const initApp = function() {
	
	// Connect the refresh button an action
	document.getElementById('refresh').addEventListener('click',function(){refreshJazz()});

	// Assign the port that we'll use for the ouput.
	outputPort = JZZ().openMidiOut(1);

	// ----------------

	let data;
	let colors;
	let message;
	let response;

	// --------------------------------------

	// Light up all pads with a color
	data = [100];
	message = getAllChangeMsg(data);

	// Send the message to the launchpad.
	console.log('Sending MIDI message', message);
	response = outputPort.send(message).then(
		()=>{console.log('Worked')},
		()=>{console.log('Error')}
	);

	// ----------------------------------

	// Light up individual pads
	data = [ [0x63, 6], [0x5b, 17], [0x5c, 27], [0x5d, 37] ];
	message = getPadChangeMsg(data);

	// Send the message to the launchpad.
	console.log('Sending MIDI message', message);
	response = outputPort.send(message).then(
		()=>{console.log('Worked')},
		()=>{console.log('Error')}
	);

	// ---------------------------

	// Light up a single column with colors 0 through 9.
	colors = [48,49,0,51,52,0,59,60,0,62]; // column from bottom(0) to top(9)
	data = [4, ...colors];
	message = getColChangeMsg(data);

	// Send the message to the launchpad.
	console.log('Sending MIDI message', message);
	response = outputPort.send(message).then(
		()=>{console.log('Worked')},
		()=>{console.log('Error')}
	);

	// ---------------------------

	// Light up a single column with colors 0 through 9.
	colors = [68,69,70,71,72,88]; // row from left(0) to right(9)
	data = [4, ...colors];
	message = getRowChangeMsg(data);

	// Send the message to the launchpad.
	console.log('Sending MIDI message', message);
	response = outputPort.send(message).then(
		()=>{console.log('Worked')},
		()=>{console.log('Error')}
	);

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