///<reference path=".././.d.ts"/>
"use strict";
var iphoneSimulatorLibPath = require("./../iphone-simulator");
var Command = (function () {
    function Command() {
    }
    Command.prototype.execute = function (args) {
        var iphoneSimulator = new iphoneSimulatorLibPath.iPhoneSimulator();
        return iphoneSimulator.run(args[0], args[1]);
    };
    return Command;
})();
exports.Command = Command;
//# sourceMappingURL=launch.js.map