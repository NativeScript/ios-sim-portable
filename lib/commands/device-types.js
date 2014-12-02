///<reference path=".././.d.ts"/>
"use strict";
var iphoneSimulatorLibPath = require("./../iphone-simulator");

var Command = (function () {
    function Command() {
    }
    Command.prototype.execute = function (args) {
        var iphoneSimulator = new iphoneSimulatorLibPath.iPhoneSimulator();
        return iphoneSimulator.printDeviceTypes();
    };
    return Command;
})();
exports.Command = Command;
//# sourceMappingURL=device-types.js.map
