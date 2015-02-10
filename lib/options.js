///<reference path=".d.ts"/>
"use strict";
var yargs = require("yargs");

var knownOptions = {
    "debug": Boolean,
    "exit": Boolean,
    "device": String,
    "stdout": String,
    "stderr": String,
    "env": String,
    "args": String,
    "timeout": String,
    "help": Boolean
};

var parsed = {};

_.each(_.keys(knownOptions), function (opt) {
    var type = knownOptions[opt];
    if (type === String) {
        yargs.string(opt);
    } else if (type === Boolean) {
        yargs.boolean(opt);
    }
});

_.each(_.keys(yargs.argv), function (opt) {
    return exports[opt] = yargs.argv[opt];
});

module.exports = exports;
//# sourceMappingURL=options.js.map
