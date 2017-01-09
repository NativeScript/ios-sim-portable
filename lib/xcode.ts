import childProcess = require("./child-process");

export function getPathFromXcodeSelect(): string {
	return childProcess.execSync("xcode-select -print-path").toString().trim();
}

export function getXcodeVersionData(): IXcodeVersionData {
	let rawData = childProcess.execSync("xcodebuild -version");
	let lines = rawData.split("\n");
	let parts = lines[0].split(" ")[1].split(".");
	return {
		major: parts[0],
		minor: parts[1],
		build: lines[1].split("Build version ")[1]
	}
}