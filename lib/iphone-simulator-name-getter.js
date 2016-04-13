///<reference path="./.d.ts"/>
"use strict";
var options = require("./options");
var IPhoneSimulatorNameGetter = (function () {
    function IPhoneSimulatorNameGetter() {
    }
    IPhoneSimulatorNameGetter.prototype.getSimulatorName = function (deviceName) {
        if (!this._simulatorName) {
            this._simulatorName = options.device || deviceName || this.defaultDeviceIdentifier;
        }
        return this._simulatorName;
    };
    return IPhoneSimulatorNameGetter;
})();
exports.IPhoneSimulatorNameGetter = IPhoneSimulatorNameGetter;
//# sourceMappingURL=iphone-simulator-name-getter.js.map