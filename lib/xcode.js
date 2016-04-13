///<reference path="./.d.ts"/>
"use strict";
var childProcess = require("./child-process");
function getPathFromXcodeSelect() {
    return childProcess.spawn("xcode-select", ["-print-path"]);
}
exports.getPathFromXcodeSelect = getPathFromXcodeSelect;
function getXcodeVersionData() {
    return (function () {
        var rawData = childProcess.spawn("xcodebuild", ["-version"]).wait();
        var lines = rawData.split("\n");
        var parts = lines[0].split(" ")[1].split(".");
        return {
            major: parts[0],
            minor: parts[1],
            build: lines[1].split("Build version ")[1]
        };
    }).future()();
}
exports.getXcodeVersionData = getXcodeVersionData;
//# sourceMappingURL=xcode.js.map