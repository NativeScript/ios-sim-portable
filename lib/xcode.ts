///<reference path="./.d.ts"/>
"use strict";

import childProcess = require("./child-process");

export function getPathFromXcodeSelect(): IFuture<string> {
	return childProcess.spawn("xcode-select", ["-print-path"]);
}

export function getXcodeVersionData(): IFuture<IXcodeVersionData> {
	return (() => {
		let rawData = childProcess.spawn("xcodebuild", ["-version"]).wait();
		let lines = rawData.split("\n");
		let parts = lines[0].split(" ")[1].split(".");
		return {
			major: parts[0],
			minor: parts[1],
			build: lines[1].split("Build version ")[1]
		}
	}).future<IXcodeVersionData>()();
}