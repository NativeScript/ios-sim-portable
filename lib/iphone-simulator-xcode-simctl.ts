import * as child_process from "child_process";
import * as _ from "lodash";
import * as childProcess from "./child-process";
import * as errors from "./errors";
import { Simctl } from "./simctl";

import * as path from "path";
import * as common from "./iphone-simulator-common";
import * as utils from "./utils";

import { homedir } from "os";
import { IPhoneSimulatorNameGetter } from "./iphone-simulator-name-getter";

export class XCodeSimctlSimulator
  extends IPhoneSimulatorNameGetter
  implements ISimulator
{
  private static DEVICE_IDENTIFIER_PREFIX =
    "com.apple.CoreSimulator.SimDeviceType";
  private deviceLogChildProcess: any = null;
  private isDeviceLogOperationStarted = false;
  public defaultDeviceIdentifier = "iPhone 6";

  private simctl: ISimctl = null;

  constructor() {
    super();
    this.simctl = new Simctl();
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

    this.startSimulator(options, device);
    if (!options.skipInstall) {
      await this.installApplication(device.id, applicationPath);
    }

    return this.simctl.launch(device.id, applicationIdentifier, options);
  }

  public sendNotification(
    notification: string,
    deviceId: string
  ): Promise<void> {
    let device = this.getDeviceFromIdentifier(deviceId);

    if (!device) {
      errors.fail("Could not find device.");
    }

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

  private static startingApps: IDictionary<Promise<string>> = {};
  private static stoppingApps: IDictionary<Promise<void>> = {};

  public async startApplication(
    deviceId: string,
    appIdentifier: string,
    options: IOptions
  ): Promise<string> {
    const startingAppKey: string = deviceId + appIdentifier;
    if (XCodeSimctlSimulator.startingApps[startingAppKey]) {
      return XCodeSimctlSimulator.startingApps[startingAppKey];
    }

    const deferPromise = utils.deferPromise<string>();
    XCodeSimctlSimulator.startingApps[startingAppKey] = deferPromise.promise;
    // let the app start for 3 seconds in order to avoid a frozen simulator
    // when the app is killed on splash screen
    setTimeout(() => {
      delete XCodeSimctlSimulator.startingApps[startingAppKey];
      deferPromise.resolve();
    }, 3000);

    // simctl launch command does not launch the process immediately and we have to wait a little bit,
    // just to ensure all related processes and services are alive.
    const launchResult = await this.simctl.launch(
      deviceId,
      appIdentifier,
      options
    );
    utils.sleep(0.5);
    return launchResult;
  }

  public async stopApplication(
    deviceId: string,
    appIdentifier: string,
    bundleExecutable: string
  ): Promise<void> {
    const appKey: string = deviceId + appIdentifier;
    if (XCodeSimctlSimulator.stoppingApps[appKey]) {
      return XCodeSimctlSimulator.stoppingApps[appKey];
    }

    const deferPromise = utils.deferPromise<void>();
    XCodeSimctlSimulator.stoppingApps[appKey] = deferPromise.promise;

    if (XCodeSimctlSimulator.startingApps[appKey]) {
      await XCodeSimctlSimulator.startingApps[appKey];
    }

    try {
      let pid = this.getPid(deviceId, bundleExecutable);
      while (pid) {
        childProcess.execSync(`kill -9 ${pid}`, null, { skipError: true });
        pid = this.getPid(deviceId, bundleExecutable);
        if (pid) {
          utils.sleep(0.1);
        }
      }
    } catch (e) {
      // ingore
    }

    try {
      await this.simctl.terminate(deviceId, appIdentifier);
    } catch (e) {
      // sometimes simctl can fail and return a non-zero exit code
      // in most cases we should be fine to ignore it and continue
      // todo: find cases where this may break things down the line
    }
    utils.sleep(0.5);

    delete XCodeSimctlSimulator.stoppingApps[appKey];
    deferPromise.resolve();

    return deferPromise.promise;
  }

  private getPid(deviceId: string, bundleExecutable: string): string {
    // Sample output of the command  ps -ef | grep app3grep | grep /86DCBE59-7ED0-447D-832B-A397322BD712/
    // 1203284766 59345 51524   0  7:11pm ??         0:01.32 /Users/username/Library/Developer/CoreSimulator/Devices/86DCBE59-7ED0-447D-832B-A397322BD712/data/Containers/Bundle/Application/4E79A7E8-9AAB-40B9-89EF-C8D7B91B819E/app3grep.app/app3grep
    // 1203284766 59486 59396   0  7:15pm ??         0:00.01 /bin/sh -c ps -ef | grep app3grep | grep /86DCBE59-7ED0-447D-832B-A397322BD712/
    // The process, that is execed by Node.js is also returned, so we need to exclude it from the result.
    // To achieve this, remove the command we've executed from the ps result.
    const grepAppProcessCommand = `ps -ef | grep ${bundleExecutable} | grep \/${deviceId}\/`;
    return childProcess
      .execSync(
        `${grepAppProcessCommand} | grep -v "${grepAppProcessCommand}" | awk '{print $2}'`,
        null,
        { skipError: true }
      )
      .toString()
      .trim();
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
        
        const isVisionOS = device.platform === "visionOS";
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
    let devices = _.sortBy(
        await this.simctl.getDevices(),
        (device) => device.runtimeVersion
      ),
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

    if (!result) {
      result = _.find(
        devices,
        (device: IDevice) => device.name === this.defaultDeviceIdentifier
      );
    }

    if (!result) {
      result = _.last(devices);
    }

    return result;
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

    if (device && (!device.runtimeVersion || !device.fullId)) {
      device = null;
    }

    if (!device || !this.isDeviceBooted(device)) {
      const isSimulatorAppRunning = this.isSimulatorAppRunning();
      const haveBootedDevices = await this.haveBootedDevices();

      if (isSimulatorAppRunning) {
        // In case user closes simulator window but simulator app is still alive
        if (!haveBootedDevices || !device) {
          device = await this.getDeviceToRun(options);
        }
        this.simctl.boot(device.id);
      }

      common.startSimulator(device && device.id);
      // startSimulaltor doesn't always finish immediately, and the subsequent
      // install fails since the simulator is not running.
      // Give it some time to start before we attempt installing.
      utils.sleep(1);
    }
  }

  private async haveBootedDevices(): Promise<boolean> {
    const bootedDevices = await this.getBootedDevices();
    return bootedDevices && bootedDevices.length > 0;
  }

  private isSimulatorAppRunning(): boolean {
    const simulatorAppName = "Simulator";

    try {
      const output = childProcess.execSync(
        `ps cax | grep -w ${simulatorAppName}`
      );
      return output.indexOf(simulatorAppName) !== -1;
    } catch (e) {
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
