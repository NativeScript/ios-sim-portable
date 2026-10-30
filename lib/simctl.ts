import * as child_process from "child_process";
import * as fs from "fs";
import * as _ from "lodash";
import * as childProcess from "./child-process";

const SUPPORTED_PLATFORMS = ["iOS", "tvOS", "visionOS"];

let xcodeToolsCheck: Promise<Error | null>;

function getXcodeToolsError(): Promise<Error | null> {
  if (!xcodeToolsCheck) {
    xcodeToolsCheck = childProcess
      .spawn("xcode-select", ["-p"])
      .then((path) =>
        path
          ? null
          : new Error(
              "Unable to work with iOS Simulator as Xcode Command Line Tools cannot be found."
            )
      )
      .catch((err) => err);
  }

  return xcodeToolsCheck;
}

// Runtime keys look like com.apple.CoreSimulator.SimRuntime.iOS-26-2. visionOS
// runtimes are named xrOS there.
function parseRuntime(
  runtime: string
): { platform: string; version: string } | null {
  const match = /(?:^|\.)([A-Za-z]+)[- ]([\d.-]+)$/.exec(runtime);
  if (!match) {
    return null;
  }

  const platform = match[1] === "xrOS" ? "visionOS" : match[1];
  return SUPPORTED_PLATFORMS.includes(platform)
    ? { platform, version: match[2].replace(/-/g, ".") }
    : null;
}

export function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] || 0) - (right[i] || 0);
    if (difference) {
      return difference;
    }
  }

  return 0;
}

export function parseDevices(simctlJson: string): IDevice[] {
  const runtimes: { [runtime: string]: any[] } =
    JSON.parse(simctlJson).devices || {};

  return Object.keys(runtimes)
    .map((key) => ({ runtime: parseRuntime(key), devices: runtimes[key] }))
    .filter(({ runtime }) => runtime)
    .sort(
      (a, b) =>
        SUPPORTED_PLATFORMS.indexOf(a.runtime.platform) -
          SUPPORTED_PLATFORMS.indexOf(b.runtime.platform) ||
        compareVersions(a.runtime.version, b.runtime.version)
    )
    .reduce<IDevice[]>(
      (result, { runtime, devices }) =>
        result.concat(
          devices
            .filter((device) => device.isAvailable !== false)
            .map((device) => ({
              name: device.name,
              id: device.udid,
              fullId: "com.apple.CoreSimulator.SimDeviceType." + device.name,
              runtimeVersion: runtime.version,
              state: device.state,
              platform: runtime.platform,
            }))
        ),
      []
    );
}

// launchctl list prints "<pid or ->\t<status>\tUIKitApplication:<bundle id>[...]".
export function parseAppPid(
  launchctlList: string,
  appIdentifier: string
): number | null {
  const label = `UIKitApplication:${appIdentifier}[`;
  for (const line of (launchctlList || "").split("\n")) {
    const [pid, , service] = line.split("\t");
    if (service && service.startsWith(label) && /^\d+$/.test(pid)) {
      return Number(pid);
    }
  }

  return null;
}

export class Simctl implements ISimctl {
  public async launch(
    deviceId: string,
    appIdentifier: string,
    options: IOptions
  ): Promise<string> {
    options = options || {};
    let args: string[] = [];
    if (options.waitForDebugger) {
      args.push("--wait-for-debugger");
    }

    args = args.concat([deviceId, appIdentifier]);

    if (options.args) {
      let applicationArgs = options.args.trim().split(/\s+/);
      _.each(applicationArgs, (arg: string) => args.push(arg));
    }

    let result = await this.spawnAsync("launch", args);

    if (options.waitForDebugger) {
      console.log(`${appIdentifier}: ${result}`);
    }

    return result;
  }

  public async boot(deviceId: string): Promise<void> {
    try {
      await this.spawnAsync("boot", [deviceId]);
    } catch (err) {
      if (err.message.indexOf("current state: Booted") === -1) {
        throw err;
      }
    }
  }

  /**
   * Boots the device if needed, and resolves once it can install and launch apps.
   */
  public bootAndWait(deviceId: string): Promise<void> {
    return this.spawnAsync("bootstatus", [deviceId, "-b"]);
  }

  public terminate(deviceId: string, appIdentifier: string): Promise<string> {
    return this.spawnAsync("terminate", [deviceId, appIdentifier]);
  }

  public async getAppPid(
    deviceId: string,
    appIdentifier: string
  ): Promise<number | null> {
    const output: string = await this.spawnAsync("spawn", [
      deviceId,
      "launchctl",
      "list",
    ]);
    return parseAppPid(output, appIdentifier);
  }

  public install(deviceId: string, applicationPath: string): Promise<void> {
    return this.spawnAsync("install", [deviceId, applicationPath]);
  }

  public uninstall(
    deviceId: string,
    appIdentifier: string,
    opts?: any
  ): Promise<void> {
    return this.spawnAsync("uninstall", [deviceId, appIdentifier], opts);
  }

  public notifyPost(deviceId: string, notification: string): Promise<void> {
    return this.spawnAsync("notify_post", [deviceId, notification]);
  }

  public async getAppContainer(
    deviceId: string,
    appIdentifier: string
  ): Promise<string> {
    try {
      const appContainerPath = await this.spawnAsync("get_app_container", [
        deviceId,
        appIdentifier,
      ]);
      // In case application is not installed on simulator, get_app_container returns some random location. After you installation, the application goes in a different location.
      return fs.existsSync(appContainerPath) ? appContainerPath : null;
    } catch (e) {
      if (e.message.indexOf("No such file or directory") > -1) {
        return null;
      }
      throw e;
    }
  }

  public async getDevices(): Promise<IDevice[]> {
    const output = await this.spawnAsync("list", ["devices", "--json"]);
    return parseDevices(output);
  }

  public getLog(
    deviceId: string,
    predicate?: string
  ): child_process.ChildProcess {
    let predicateArgs: string[] = [];

    if (predicate) {
      predicateArgs = ["--predicate", predicate];
    }

    return this.simctlSpawn(
      "spawn",
      [deviceId, "log", "stream", "--style", "syslog"].concat(predicateArgs)
    );
  }

  private async spawnAsync(
    command: string,
    args: string[],
    spawnOpts?: child_process.SpawnOptions,
    opts?: ISkipErrorComposition
  ): Promise<any> {
    const xcodeToolsError = await getXcodeToolsError();
    if (xcodeToolsError) {
      if (opts && opts.skipError) {
        return null;
      }
      throw xcodeToolsError;
    }

    return childProcess.spawn(
      "xcrun",
      ["simctl", command].concat(args),
      spawnOpts,
      opts
    );
  }

  private simctlSpawn(
    command: string,
    args: string[],
    spawnOpts?: child_process.SpawnOptions
  ): child_process.ChildProcess {
    return child_process.spawn(
      "xcrun",
      ["simctl", command].concat(args),
      spawnOpts
    );
  }
}
