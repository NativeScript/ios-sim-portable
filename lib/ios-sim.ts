import * as _ from "lodash";

function getSimulator(): ISimulator {
	let libraryPath = require("./iphone-simulator");
	let obj = new libraryPath.iPhoneSimulator();
	return obj.createSimulator();
}

const publicApi = {};

Object.defineProperty(publicApi, "getRunningSimulator", {
	get: () => {
		return (...args: any[]) => {
			let isResolved = false;

			return new Promise<any>((resolve, reject) => {
				let libraryPath = require("./iphone-simulator-xcode-simctl");
				let simulator = new libraryPath.XCodeSimctlSimulator();

				const tryGetBootedDevice = () => {
					try {
						return simulator.getBootedDevice.apply(simulator, args);
					} catch (err) {
						if (!isResolved) {
							isResolved  = true;
							reject(err);
						}
					}
				}

				let result = tryGetBootedDevice();

				if (!isResolved && !result) {
					let repeatCount = 30;
					let timer = setInterval(() => {
						result = tryGetBootedDevice();
						if ((result || !repeatCount) && !isResolved) {
							isResolved = true;
							clearInterval(timer);
							resolve(result);
						}
						repeatCount--;
					}, 500);
				}
			});
		}
	}
});

Object.defineProperty(publicApi, "getRunningSimulators", {
	get: () => {
		return (...args: any[]) => {
			let isResolved = false;

			return new Promise<any>((resolve, reject) => {
				const libraryPath = require("./iphone-simulator-xcode-simctl");
				const simulator = new libraryPath.XCodeSimctlSimulator();
				
				const tryGetBootedDevices = () => {
					try {
						return simulator.getBootedDevices.apply(simulator, args);
					} catch (err) {
						if (!isResolved) {
							isResolved = true;
							reject(err);
						}
					}
				}

				let result = tryGetBootedDevices();

				if (!isResolved && !result) {
					let repeatCount = 30;
					const timer = setInterval(() => {
						result = tryGetBootedDevices();
						if ((result || !repeatCount) && !isResolved) {
							isResolved = true;
							clearInterval(timer);
							resolve(result);
						}
						repeatCount--;
					}, 500);
				}
			});
		}
	}
});

Object.defineProperty(publicApi, "getApplicationPath", {
	get: () => {
		return (...args: any[]) => {
			let simulator = getSimulator();
			let result = simulator.getApplicationPath.apply(simulator, args);
			return result;
		}
	}
});

Object.defineProperty(publicApi, "getInstalledApplications", {
	get: () => {
		return (...args: any[]) => {
			let simulator = getSimulator();
			let installedApplications: IApplication[] = simulator.getInstalledApplications.apply(simulator, args);
			let result = _.map(installedApplications, application => application.appIdentifier);
			return result;
		}
	}
});

["installApplication",
	"uninstallApplication",
	"startApplication",
	"stopApplication",
	"printDeviceLog",
	"getDeviceLogProcess",
	"startSimulator",
	"getSimulatorName",
	"getDevices"].forEach(methodName => {
		Object.defineProperty(publicApi, methodName, {
			get: () => {
				return (...args: any[]) => {
					let simulator: any = getSimulator();
					return simulator[methodName].apply(simulator, args);
				}
			}
		});
	})

module.exports = publicApi;
