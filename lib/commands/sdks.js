///<reference path=".././.d.ts"/>
"use strict";
var iphoneSimulatorLibPath = require("./../iphone-simulator");
var Command = (function () {
    function Command() {
    }
    Command.prototype.execute = function (args) {
        var iphoneSimulator = new iphoneSimulatorLibPath.iPhoneSimulator();
        return iphoneSimulator.printSDKS();
    };
    return Command;
})();
exports.Command = Command;
//# sourceMappingURL=sdks.js.map