///<reference path="./.d.ts"/>
"use strict";
var Fiber = require("fibers");
function stringify(arr, delimiter) {
    delimiter = delimiter || ", ";
    return arr.join(delimiter);
}
exports.stringify = stringify;
function sleep(ms) {
    var fiber = Fiber.current;
    setTimeout(function () { return fiber.run(); }, ms);
    Fiber.yield();
}
exports.sleep = sleep;
//# sourceMappingURL=utils.js.map