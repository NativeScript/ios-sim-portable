var fs = require("fs");

var callback = function() { };

if (!fs.existsSync("lib/ios-sim.js")) {
	var grunt = require("grunt");
	grunt.cli.tasks = ["ts:devlib"];
	grunt.cli(null, callback);
} else {
	process.nextTick(callback);
}
