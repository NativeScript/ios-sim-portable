///<reference path=".d.ts"/>
"use strict";

var yargs = require("yargs");

class OptionType {
	public static String = "string";
	public static Boolean = "boolean";
}

var knownOptions: any = {
	"debug": { type: OptionType.Boolean },
	"exit": { type: OptionType.Boolean },
	"device": { type: OptionType.String },
	"stdout": { type: OptionType.String },
	"stderr": { type: OptionType.String },
	"env": { type: OptionType.String },
	"args": { type: OptionType.String },
	"timeout": { type: OptionType.String },
	"help": { type: OptionType.Boolean },
	"logging": { type: OptionType.Boolean },
	"sdkVersion": { type: OptionType.String }
};

var parsed: any = {};

_.each(_.keys(knownOptions), opt => {
	yargs(process.argv.slice(2)).options(knownOptions).argv;
});

_.each(_.keys(yargs.argv), opt => parsed[opt] = yargs.argv[opt]);

export = parsed;