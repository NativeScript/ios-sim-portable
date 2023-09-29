import * as child_process from "child_process";
import * as fs from "fs";
import * as _ from "lodash";
import * as childProcess from "./child-process";
import * as errors from "./errors";

export class Simctl implements ISimctl {
  public async launch(
    deviceId: string,
    appIdentifier: string,
    options: IOptions
  ): Promise<string> {
    options = options || {};
    let args: string[] = [];
    if (options.waitForDebugger) {
      args.push("-w");
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

  public boot(deviceId: string): Promise<void> {
    return this.spawnAsync("boot", [deviceId]);
  }

  public terminate(deviceId: string, appIdentifier: string): Promise<string> {
    return this.spawnAsync("terminate", [deviceId, appIdentifier]);
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
    let rawDevices = await this.spawnAsync("list", ["devices"]);

    // expect to get a listing like
    // -- iOS 8.1 --
    //     iPhone 4s (3CA6E7DD-220E-45E5-B716-1E992B3A429C) (Shutdown)
    //     ...
    // -- iOS 8.2 --
    //     iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
    //     ...
    // so, get the `-- iOS X.X --` line to find the sdk (X.X)
    // and the rest of the listing in order to later find the devices

    let deviceSectionRegex = /-- (iOS|visionOS) (.+) --(\n    .+)*/gm;
    let match = deviceSectionRegex.exec(rawDevices);

    let matches: any[] = [];

    // make an entry for each sdk version
    while (match !== null) {
      matches.push(match);
      match = deviceSectionRegex.exec(rawDevices);
    }

    if (matches.length < 1) {
      errors.fail("Could not find device section. " + match);
    }

    // get all the devices for each sdk
    let devices: IDevice[] = [];
    for (match of matches) {
      let sdk: string = match[2];

      // split the full match into lines and remove the first
      for (let line of match[0].split("\n").slice(1)) {
        // a line is something like
        //    iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
        //    iPad Air 2 (9696A8ED-3020-49FC-90D6-DAFD29A0EA8D) (Shutdown)
        //    iPad Pro (9.7 inch) (7FF984D4-0755-432D-BE0E-6EB44F0489CB) (Shutdown)
        //    iPad Pro (12.9 inch) (F02012C8-6D4D-46FF-90D7-5DF90EF579E8) (Booted)
        // retrieve:
        //   iPhone 4s
        //   A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E
        //   Shutdown
        let lineRegex =
          /^\s+(.*?)\s+\(([0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12})\)\s+\((.*?)\)(\s+\((?:.*?)\))?/;
        let lineMatch = lineRegex.exec(line);
        if (lineMatch === null) {
          errors.fail("Could not match line. " + line);
        }

        let available = lineMatch[4];
        if (available === null || available === undefined) {
          devices.push({
            name: lineMatch[1],
            id: lineMatch[2],
            fullId: "com.apple.CoreSimulator.SimDeviceType." + lineMatch[1],
            runtimeVersion: sdk,
            state: lineMatch[3],
            platform: match[1],
          });
        }
      }
    }

    return devices;
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
    const { canExecuteXcrun, xcodeToolsError } =
      this.verifyXcodeCommandLineToolsAreInstalled();
    if (!canExecuteXcrun) {
      if (opts.skipError) {
        return null;
      } else {
        throw xcodeToolsError;
      }
    }

    return childProcess.spawn(
      "xcrun",
      ["simctl", command].concat(args),
      spawnOpts,
      opts
    );
  }

  private verifyXcodeCommandLineToolsAreInstalled(): {
    canExecuteXcrun: boolean;
    xcodeToolsError: Error;
  } {
    let canExecuteXcrun = false;
    let xcodeToolsError: Error = null;

    try {
      const result = childProcess.execSync("xcode-select -p", {
        stdio: "pipe",
      });
      canExecuteXcrun = !!(result && result.toString().trim());
      if (!canExecuteXcrun) {
        xcodeToolsError = new Error(
          "Unable to work with iOS Simulator as Xcode Command Line Tools cannot be found."
        );
      }
    } catch (err) {
      xcodeToolsError = err;
    }

    return { canExecuteXcrun, xcodeToolsError };
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
