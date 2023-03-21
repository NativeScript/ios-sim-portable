import * as bplistParser from "bplist-parser";
import * as fs from "fs";
import * as _ from "lodash";
import { homedir } from "os";
import * as path from "path";
import * as plist from "plist";
import * as childProcess from "./child-process";
import * as xcode from "./xcode";

export function getInstalledApplications(deviceId: string): IApplication[] {
  let rootApplicationsPath = path.join(
    homedir(),
    `/Library/Developer/CoreSimulator/Devices/${deviceId}/data/Containers/Bundle/Application`
  );
  if (!fs.existsSync(rootApplicationsPath)) {
    rootApplicationsPath = path.join(
      homedir(),
      `/Library/Developer/CoreSimulator/Devices/${deviceId}/data/Applications`
    );
  }

  // since ios 14 - the Applications folder is not created on a fresh simulator, so if it doesn't exist
  // we know there are no applications installed.
  if (!fs.existsSync(rootApplicationsPath)) {
    return [];
  }

  let applicationGuids = fs.readdirSync(rootApplicationsPath);
  let result: IApplication[] = [];
  _.each(applicationGuids, (applicationGuid) => {
    let fullApplicationPath = path.join(rootApplicationsPath, applicationGuid);
    if (fs.statSync(fullApplicationPath).isDirectory()) {
      let applicationDirContents = fs.readdirSync(fullApplicationPath);
      let applicationName = _.find(
        applicationDirContents,
        (fileName) => path.extname(fileName) === ".app"
      );
      let plistFilePath = path.join(
        fullApplicationPath,
        applicationName,
        "Info.plist"
      );
      result.push({
        guid: applicationGuid,
        appIdentifier: getBundleIdentifier(plistFilePath),
        path: path.join(fullApplicationPath, applicationName),
      });
    }
  });

  return result;
}

export function startSimulator(deviceId?: string): void {
  let simulatorPath = path.resolve(
    xcode.getPathFromXcodeSelect(),
    "Applications",
    "Simulator.app"
  );
  let args = ["open", simulatorPath];
  if (deviceId) {
    args.push("--args", "-CurrentDeviceUDID", deviceId);
  }
  childProcess.execSync(args.join(" "));
}

function parsePlist(fileNameOrBuffer: string | Buffer) {
  let data;

  if (Buffer.isBuffer(fileNameOrBuffer)) {
    data = fileNameOrBuffer;
  } else {
    data = fs.readFileSync(fileNameOrBuffer);
  }

  return bplistParser.parseBuffer(data);
}

function getBundleIdentifier(plistFilePath: string): string {
  let plistData: any;
  try {
    plistData = parsePlist(plistFilePath)[0];
  } catch (err) {
    let content = fs.readFileSync(plistFilePath).toString();
    plistData = plist.parse(content);
  }

  return plistData && plistData.CFBundleIdentifier;
}
