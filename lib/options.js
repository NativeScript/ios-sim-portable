///<reference path=".d.ts"/>
"use strict";
var yargs = require("yargs");
<<<<<<< HEAD
var knownOptions = {
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
    "waitForDebugger": Boolean,
    "sdkVersion": String
};
var parsed = {};
_.each(_.keys(knownOptions), function (opt) {
    var type = knownOptions[opt];
    if (type === String) {
        yargs.string(opt);
    }
    else if (type === Boolean) {
        yargs.boolean(opt);
    }
});
_.each(_.keys(yargs.argv), function (opt) { return parsed[opt] = yargs.argv[opt]; });
=======
var OptionType = (function () {
    function OptionType() {
    }
    OptionType.String = "string";
    OptionType.Boolean = "boolean";
    return OptionType;
})();
var knownOptions = {
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
var parsed = {};
var argv = yargs(process.argv.slice(2)).options(knownOptions).argv;
// DO NOT REMOVE { } as when they are missing and some of the option values is false, the each stops as it thinks we have set "return false".
_.each(_.keys(argv), function (optionName) {
    parsed[optionName] = argv[optionName];
});
>>>>>>> Some .js changes
module.exports = parsed;
//# sourceMappingURL=options.js.map