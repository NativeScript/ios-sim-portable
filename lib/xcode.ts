import * as childProcess from "./child-process";

export function getPathFromXcodeSelect(): Promise<string> {
  return childProcess.spawn("xcode-select", ["-print-path"]);
}

let versionData: Promise<IXcodeVersionData>;

export function getXcodeVersionData(): Promise<IXcodeVersionData> {
  if (!versionData) {
    versionData = childProcess
      .spawn("xcodebuild", ["-version"])
      .then((output) => {
        const lines = output.split("\n");
        const parts = lines[0].split(" ")[1].split(".");
        return {
          major: parts[0],
          minor: parts[1],
          build: lines[1].split("Build version ")[1],
        };
      });
  }

  return versionData;
}
