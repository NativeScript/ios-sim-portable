"use strict";

var shelljs = require("shelljs"),
	fs = require("fs"),
	path = require("path"),
	fibersDirName = "fibers",
	nodeModulesDirName = "node_modules";

try {
	// In case there are fibers in upper level's node_modules dir, we should remove iOSSimPortable's fibers module.
	var pathToUpperLevelNodeModulesDir = path.join(__dirname, ".."),
		pathToUpperLevelFibersDir = path.join(pathToUpperLevelNodeModulesDir, fibersDirName);

	var nodeModulesStat = fs.statSync(pathToUpperLevelNodeModulesDir),
		fibersStat = fs.statSync(pathToUpperLevelFibersDir);

	if (nodeModulesStat.isDirectory() && path.basename(pathToUpperLevelNodeModulesDir) === nodeModulesDirName && fibersStat.isDirectory()) {
		shelljs.rm("-rf", path.join(__dirname, nodeModulesDirName, fibersDirName));
	}
} catch (err) {
	// Ignore the error. Most probably ios-sim-portable is not used as dependency, so we should not delete anything.
}
