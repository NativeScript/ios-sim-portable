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

export async function startSimulator(
  _xcodeVersion: number,
  deviceId?: string
): Promise<void> {
  const simulatorPath = path.resolve(
    xcode.getPathFromXcodeSelect(),
    "Applications",
    "Simulator.app"
  );
  if (!fs.existsSync(simulatorPath)) {
    if (!deviceId) {
      throw new Error("A device identifier is required when Simulator.app is unavailable.");
    }
    await childProcess.spawn("xcrun", ["simctl", "bootstatus", deviceId, "-b"]);
    return;
  }

  const args = [simulatorPath];
  if (deviceId) {
    args.push("--args", "-CurrentDeviceUDID", deviceId);
  }
  await childProcess.spawn("open", args);
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
