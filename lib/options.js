///<reference path=".d.ts"/>
"use strict";
var yargs = require("yargs");
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
_.each(_.keys(knownOptions), function (opt) {
    yargs(process.argv.slice(2)).options(knownOptions).argv;
});
_.each(_.keys(yargs.argv), function (opt) { return parsed[opt] = yargs.argv[opt]; });
module.exports = parsed;
//# sourceMappingURL=options.js.map