var fs = require("fs"),
	path = require("path");

var pathToTypeScriptEntryPoint = path.join(__dirname, "lib", "ios-sim.ts");
if (fs.existsSync(pathToTypeScriptEntryPoint)) {
	var callback = function(err) {},
		grunt = require("grunt");

	grunt.cli.tasks = ["ts:devlib"];
	grunt.cli(null, callback);
}
