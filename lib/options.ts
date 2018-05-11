///<reference path=".d.ts"/>
"use strict";

var yargs = require("yargs");
import * as _ from "lodash";

class OptionType {
	public static String = "string";
	public static Boolean = "boolean";
}

var knownOptions: any = {
	"debug": { type: OptionType.Boolean },
	"device": { type: OptionType.String },
	"args": { type: OptionType.String },
	"help": { type: OptionType.Boolean },
	"waitForDebugger": { type: OptionType.Boolean },
	"sdkVersion": { type: OptionType.String }, // Obsolete, use sdk instead.
	"sdk": { type: OptionType.String },
	"skipInstall": { type: OptionType.Boolean }
};

var parsed: any = {};
var argv = yargs(process.argv.slice(2)).options(knownOptions).argv;

// DO NOT REMOVE { } as when they are missing and some of the option values is false, the each stops as it thinks we have set "return false".
_.each(_.keys(argv), optionName => {
	parsed[optionName] = argv[optionName]
});

export = parsed;