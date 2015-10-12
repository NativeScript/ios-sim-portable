///<reference path="./.d.ts"/>
"use strict";
var util = require("util");
function fail(errorMessage) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    args.unshift(errorMessage);
    throw new Error(util.format.apply(null, args));
}
exports.fail = fail;
//# sourceMappingURL=errors.js.map