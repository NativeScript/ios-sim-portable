import * as _ from "lodash";

function getSimulator(): ISimulator {
	let libraryPath = require("./iphone-simulator");
	let obj = new libraryPath.iPhoneSimulator();
	return obj.createSimulator();
}

const publicApi = {};

Object.defineProperty(publicApi, "getRunningSimulator", {
	get: () => {
		return async (...args: any[]) => {
			let isResolved = false;

			return new Promise<any>((resolve, reject) => {
				let libraryPath = require("./iphone-simulator-xcode-simctl");
				let simulator = new libraryPath.XCodeSimctlSimulator();
				let repeatCount = 30;
				let timer = setInterval(() => {
					let result = simulator.getBootedDevice.apply(simulator, args);
					if ((result || !repeatCount) && !isResolved) {
						clearInterval(timer);
						resolve(result);
					}
					repeatCount--;
				}, 500);
			});
		}
	}
});

Object.defineProperty(publicApi, "getApplicationPath", {
	get: () => {
		return async (...args: any[]) => {
			let simulator = getSimulator();
			let result = await simulator.getApplicationPath.apply(simulator, args);
			return result;
		}
	}
});

Object.defineProperty(publicApi, "getInstalledApplications", {
	get: () => {
		return async (...args: any[]) => {
			let simulator = getSimulator();
			let installedApplications: IApplication[] = await simulator.getInstalledApplications.apply(simulator, args);
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
	"getSimulatorName"].forEach(methodName => {
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
