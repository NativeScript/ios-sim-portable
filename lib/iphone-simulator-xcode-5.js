///<reference path="./.d.ts"/>
"use strict";
var options = require("./options");

var $ = require("NodObjC");

var XCode5Simulator = (function () {
    function XCode5Simulator() {
    }
    Object.defineProperty(XCode5Simulator.prototype, "validDeviceIdentifiers", {
        get: function () {
            return _.keys(XCode5Simulator.allowedDeviceIdentifiers);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(XCode5Simulator.prototype, "deviceIdentifiersInfo", {
        get: function () {
            return _.keys(XCode5Simulator.allowedDeviceIdentifiers);
        },
        enumerable: true,
        configurable: true
    });

    XCode5Simulator.prototype.setSimulatedDevice = function (config) {
        config("setSimulatedDeviceInfoName", $(this.deviceIdentifier));
    };

    Object.defineProperty(XCode5Simulator.prototype, "deviceIdentifier", {
        get: function () {
            var identifier = options.device || XCode5Simulator.DEFAULT_DEVICE_IDENTIFIER;
            return XCode5Simulator.allowedDeviceIdentifiers[identifier];
        },
        enumerable: true,
        configurable: true
    });
    XCode5Simulator.DEFAULT_DEVICE_IDENTIFIER = "iPhone";

    XCode5Simulator.allowedDeviceIdentifiers = {
        "iPhone": "iPhone",
        "iPhone-Retina-3.5-inch": "iPhone Retina (3.5-inch)",
        "iPhone-Retina-4-inch": "iPhone Retina (4-inch)",
        "iPhone-Retina-4-inch-64-bit": "iPhone Retina (4-inch 64-bit)",
        "iPad": "iPad",
        "iPad-Retina": "iPad Retina",
        "iPad-Retina-64-bit": "iPad Retina (64-bit)"
    };
    return XCode5Simulator;
})();
exports.XCode5Simulator = XCode5Simulator;
//# sourceMappingURL=iphone-simulator-xcode-5.js.map
