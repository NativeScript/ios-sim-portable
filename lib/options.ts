///<reference path=".d.ts"/>
"use strict";

var yargs = require("yargs");

var knownOptions: any = {
	"debug": Boolean,
	"exit": Boolean,
	"device": String,
	"stdout": String,
	"stderr": String,
	"env": String,
	"args": String,
	"timeout": String,
	"help": Boolean,
	"logging": Boolean,
	"waitForDebugger": Boolean
};

var parsed: any = {};

_.each(_.keys(knownOptions), opt => {
	var type = knownOptions[opt];
	if(type === String) {
		yargs.string(opt);
	} else if (type === Boolean) {
		yargs.boolean(opt);
	}
});

_.each(_.keys(yargs.argv), opt => parsed[opt] = yargs.argv[opt]);

export = parsed;