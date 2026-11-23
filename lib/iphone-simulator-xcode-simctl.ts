import * as child_process from "child_process";
import * as _ from "lodash";
import * as childProcess from "./child-process";
import * as errors from "./errors";
import { compareVersions, Simctl } from "./simctl";

import * as path from "path";
import * as common from "./iphone-simulator-common";
import * as utils from "./utils";

import { homedir } from "os";
import { IPhoneSimulatorNameGetter } from "./iphone-simulator-name-getter";
import * as xcode from "./xcode";
export class XCodeSimctlSimulator
  extends IPhoneSimulatorNameGetter
  implements ISimulator
{
  private static DEVICE_IDENTIFIER_PREFIX =
    "com.apple.CoreSimulator.SimDeviceType";
  private deviceLogChildProcess: any = null;
  private isDeviceLogOperationStarted = false;
  public defaultDeviceIdentifier = "iPhone 6";
  private simctl: ISimctl;

  constructor() {
    super();
    this.simctl = new Simctl();
  }
  private async getXcodeMajorVersion(): Promise<number> {
    return Number.parseInt((await xcode.getXcodeVersionData()).major);
  }

  public getDevices(): Promise<IDevice[]> {
    return this.simctl.getDevices();
  }

  public async getSdks(): Promise<ISdk[]> {
    let devices = await this.simctl.getDevices();
    return _.map(devices, (device) => {
      return {
        displayName: `iOS ${device.runtimeVersion}`,
        version: device.runtimeVersion,
      };
    });
  }

  public async run(
    applicationPath: string,
    applicationIdentifier: string,
    options: IOptions
  ): Promise<string> {
    const device = await this.getDeviceToRun(options);

    await this.startSimulator(options, device);
    if (!options.skipInstall) {
      await this.installApplication(device.id, applicationPath);
    }

    return this.simctl.launch(device.id, applicationIdentifier, options);
  }

  public sendNotification(
    notification: string,
    deviceId: string
  ): Promise<void> {
    return this.simctl.notifyPost(deviceId, notification);
  }

  public getApplicationPath(
    deviceId: string,
    applicationIdentifier: string
  ): Promise<string> {
    return this.simctl.getAppContainer(deviceId, applicationIdentifier);
  }

  public getInstalledApplications(deviceId: string): IApplication[] {
    return common.getInstalledApplications(deviceId);
  }

  public async installApplication(
    deviceId: string,
    applicationPath: string
  ): Promise<void> {
    try {
      await this.simctl.install(deviceId, applicationPath);
    } catch (err) {
      await this.simctl.install(deviceId, applicationPath);
    }
  }

  public uninstallApplication(
    deviceId: string,
    appIdentifier: string
  ): Promise<void> {
    return this.simctl.uninstall(deviceId, appIdentifier, { skipError: true });
  }

  // The app gets this long to start, in order to avoid a frozen simulator when
  // it is killed on the splash screen. Debug sessions also ask to start an app
  // that was launched just before, which must not launch it again.
  private static APP_START_MILLISECONDS = 3000;
  private static startingApps: IDictionary<{
    launch: Promise<string>;
    startedAt: number;
  }> = {};
  private static stoppingApps: IDictionary<Promise<void>> = {};

  public startApplication(
    deviceId: string,
    appIdentifier: string,
    options: IOptions
  ): Promise<string> {
    const appKey = deviceId + appIdentifier;
    const starting = XCodeSimctlSimulator.startingApps[appKey];
    if (
      starting &&
      Date.now() - starting.startedAt < XCodeSimctlSimulator.APP_START_MILLISECONDS
    ) {
      return starting.launch;
    }

    const launch = this.simctl.launch(deviceId, appIdentifier, options);
    const entry = { launch, startedAt: Date.now() };
    XCodeSimctlSimulator.startingApps[appKey] = entry;
    launch.catch(() => {
      if (XCodeSimctlSimulator.startingApps[appKey] === entry) {
        delete XCodeSimctlSimulator.startingApps[appKey];
      }
    });

    return launch;
  }

  public stopApplication(
    deviceId: string,
    appIdentifier: string,
    bundleExecutable?: string
  ): Promise<void> {
    const appKey = deviceId + appIdentifier;
    if (!XCodeSimctlSimulator.stoppingApps[appKey]) {
      XCodeSimctlSimulator.stoppingApps[appKey] = this.stopApp(
        deviceId,
        appIdentifier
      ).finally(() => {
        delete XCodeSimctlSimulator.stoppingApps[appKey];
      });
    }

    return XCodeSimctlSimulator.stoppingApps[appKey];
  }

  private async stopApp(deviceId: string, appIdentifier: string): Promise<void> {
    const appKey = deviceId + appIdentifier;
    const starting = XCodeSimctlSimulator.startingApps[appKey];
    if (starting) {
      const remaining =
        XCodeSimctlSimulator.APP_START_MILLISECONDS -
        (Date.now() - starting.startedAt);
      if (remaining > 0) {
        await utils.delay(remaining);
      }
      delete XCodeSimctlSimulator.startingApps[appKey];
    }

    try {
      await this.simctl.terminate(deviceId, appIdentifier);
    } catch (err) {
      if (err.message.indexOf("found nothing to terminate") === -1) {
        await this.killApp(deviceId, appIdentifier);
      }
    }
  }

  private async killApp(deviceId: string, appIdentifier: string): Promise<void> {
    try {
      const pid = await this.simctl.getAppPid(deviceId, appIdentifier);
      if (pid) {
        process.kill(pid, "SIGKILL");
      }
    } catch (err) {
      // The simulator may be gone, in which case the app is too.
    }
  }

  public async getDeviceLogProcess(
    deviceId: string,
    predicate?: string
  ): Promise<child_process.ChildProcess> {
    const device = await this.getDeviceFromIdentifier(deviceId);
    return new Promise<child_process.ChildProcess>((resolve, reject) => {
      let timer: NodeJS.Timer;
      let isFulfilled = false;

      const fulfillSafe = (data?: Error | string) => {
        if (!isFulfilled) {
          isFulfilled = true;
          if (data instanceof Error) {
            reject(data);
          } else {
            resolve(this.deviceLogChildProcess);
          }
        }

        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        if (this.deviceLogChildProcess) {
          if (this.deviceLogChildProcess.stdout) {
            this.deviceLogChildProcess.stdout.removeListener(
              "data",
              fulfillSafe
            );
          }

          this.deviceLogChildProcess.removeListener("error", fulfillSafe);
        }
      };

      if (!this.isDeviceLogOperationStarted) {
        const deviceVersion = device ? device.runtimeVersion : "";
        const majorVersion = deviceVersion.split(".")[0];
        
        const isVisionOS = device && device.platform === "visionOS";
        const isSupportediOSVersion =
          majorVersion && parseInt(majorVersion) >= 11;

        if (isVisionOS || isSupportediOSVersion) {
          timer = setTimeout(() => {
            fulfillSafe();
          }, 3000);

          // For some reason starting the process takes a lot of time. So wait for the first message on stdout and resolve the promise at this point.
          this.deviceLogChildProcess = this.simctl.getLog(deviceId, predicate);
          if (this.deviceLogChildProcess.stdout) {
            this.deviceLogChildProcess.stdout.once("data", fulfillSafe);
            this.deviceLogChildProcess.once("error", fulfillSafe);
          } else {
            fulfillSafe();
          }
        } else {
          const logFilePath = path.join(
            homedir(),
            "Library",
            "Logs",
            "CoreSimulator",
            deviceId,
            "system.log"
          );
          this.deviceLogChildProcess = child_process.spawn("tail", [
            "-f",
            "-n",
            "1",
            logFilePath,
          ]);
          fulfillSafe();
        }

        this.isDeviceLogOperationStarted = true;
      } else {
        fulfillSafe();
      }
    });
  }

  private async getDeviceToRun(
    options: IOptions,
    device?: any
  ): Promise<IDevice> {
    let devices = await this.simctl.getDevices(),
      sdkVersion = options.sdkVersion || options.sdk,
      deviceIdOrName = options.device;

    if (device && (device.sdkVersion || device.sdk)) {
      sdkVersion = device.sdkVersion || device.sdk;
    }

    if (device && device.id) {
      deviceIdOrName = device.id;
    }

    let result = _.find(devices, (device: IDevice) => {
      if (sdkVersion && !deviceIdOrName) {
        return device.runtimeVersion === sdkVersion;
      }

      if (deviceIdOrName && !sdkVersion) {
        return device.name === deviceIdOrName || device.id === deviceIdOrName;
      }

      if (deviceIdOrName && sdkVersion) {
        return (
          device.runtimeVersion === sdkVersion &&
          (device.name === deviceIdOrName || device.id === deviceIdOrName)
        );
      }

      if (!sdkVersion && !deviceIdOrName) {
        return this.isDeviceBooted(device);
      }
    });

    return result || this.getDefaultDevice(devices);
  }

  private getDefaultDevice(devices: IDevice[]): IDevice {
    const newest = (candidates: IDevice[]) =>
      _.last(
        [...candidates].sort((a, b) =>
          compareVersions(a.runtimeVersion, b.runtimeVersion)
        )
      );
    const iOS = devices.filter((device) => device.platform === "iOS");

    return (
      newest(iOS.filter((device) => device.name.startsWith("iPhone"))) ||
      newest(iOS) ||
      newest(devices)
    );
  }

  private isDeviceBooted(device: IDevice): boolean {
    if (!device) {
      return false;
    }

    return device.state === "Booted";
  }

  private async getBootedDevice(): Promise<IDevice> {
    let devices = await this.simctl.getDevices();
    return _.find(devices, (device) => this.isDeviceBooted(device));
  }

  private async getBootedDevices(): Promise<IDevice[]> {
    const devices = await this.simctl.getDevices();
    return _.filter(devices, (device) => this.isDeviceBooted(device));
  }

  public async startSimulator(
    options: IOptions,
    device?: IDevice
  ): Promise<void> {
    if (!device && options.device) {
      await this.verifyDevice(options.device);
    }

    // In case the id is undefined, skip verification - we'll start default simulator.
    if (device && device.id) {
      await this.verifyDevice(device);
    }

    if (!device || !device.runtimeVersion || !device.fullId) {
      device = await this.getDeviceToRun(options);
    }

    if (this.isDeviceBooted(device)) {
      return;
    }

    // Booted before the app opens, without telling it which device to show:
    // Simulator.app would boot that device too, and show an error dialog if
    // simctl got there first. It shows the devices that are booted on its own.
    await this.simctl.boot(device.id);
    if (!(await this.isSimulatorAppRunning())) {
      await common.startSimulatorApp(await this.getXcodeMajorVersion());
    }

    await this.simctl.bootAndWait(device.id);
  }

  private async isSimulatorAppRunning(): Promise<boolean> {
    const appName = (await this.getXcodeMajorVersion()) >= 27 ? "DeviceHub" : "Simulator";

    try {
      await childProcess.spawn("pgrep", ["-x", appName]);
      return true;
    } catch (err) {
      return false;
    }
  }

  private async verifyDevice(device: IDevice | string): Promise<void> {
    const availableDevices = await this.getDevices();
    const deviceId = (<IDevice>device).id || device;
    if (
      !_.find(availableDevices, { id: deviceId }) &&
      !_.find(availableDevices, { name: deviceId })
    ) {
      errors.fail(
        `No simulator image available for device identifier '${deviceId}'.`
      );
    }
  }

  private async getDeviceFromIdentifier(deviceId: string) {
    const availableDevices = await this.getDevices();

    return _.find(availableDevices, { id: deviceId });
  }
}
