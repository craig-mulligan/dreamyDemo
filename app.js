'use strict';

// Module requires
var salesforce = require('./salesforce.js');

// Environment variables from resin.io
var deviceName = process.env.RESIN_DEVICE_UUID;
var warningThreshold = process.env.THRESHOLD || 7.6;
var port = process.env.PORT || 0;
var interval = process.env.PORT || 1000;

// Salesforce.com credentials
var username = process.env.SF_USERNAME;
var password = process.env.SF_PASSWORD;
var securityToken = process.env.SF_SEC_TOKEN;

// Grove-pi sensors
var GrovePi = require('node-grovepi').GrovePi;
var Board = GrovePi.board;
var LightAnalogSensor = GrovePi.sensors.LightAnalog;

var board = new Board({
	debug: true,
	onError: function(err) {
	  console.log('Something wrong just happened')
	  console.log(err)
	},
	onInit: function(res) {
	  	if (!res) {
	  		console.error('Grove pi failed to init with result', res);
	  		return;
	  	}
		console.log('GrovePi Version :: ' + board.version());

		var lightSensor = new LightAnalogSensor(parseInt(port))
	    console.log('Light Analog Sensor (start watch)');

	    lightSensor.on('change', function(res) {
	        console.log('Light onChange value=' + res)
	        // Compare reading against warningThreshold
	        compare(res)
	    })

		lightSensor.watch(parseInt(interval));
	}
});

function compare(val){
	if (val >= parseInt(warningThreshold)) {
		var description = "WARNING: " + val + " on device " + deviceName;
      	console.log("logging case to salesforce...");
      	salesforce.createCase("Threshold Exceeded", description, function (err) { 
      		if ( err ) {
      			console.error("failed to create case", err);
      			return;
      		}
      	});
	} else {
		console.log("no warnings to report");
	}
}

function run(callback){
	// Authenticate with salesforce
	salesforce.auth(username, password, securityToken, callback);
}

function setupBoard(){
	// intiate grovepi
	board.init();
}

// run app
run(setupBoard);