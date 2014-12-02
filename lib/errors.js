///<reference path="./.d.ts"/>
"use strict";
var util = require("util");

function fail(errorMessage) {
    var args = [];
    for (var _i = 0; _i < (arguments.length - 1); _i++) {
        args[_i] = arguments[_i + 1];
    }
    args.unshift(errorMessage);
    throw new Error(util.format.apply(null, args));
}
exports.fail = fail;
//# sourceMappingURL=errors.js.map
