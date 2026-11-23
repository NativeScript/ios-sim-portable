import * as _ from "lodash";
import { delay } from "./utils";

function getSimulator(): ISimulator {
	let libraryPath = require("./iphone-simulator");
	let obj = new libraryPath.iPhoneSimulator();
	return obj.createSimulator();
}

const publicApi = {};

Object.defineProperty(publicApi, "getRunningSimulator", {
	get: () => {
		return async (...args: any[]) => {
			const libraryPath = require("./iphone-simulator-xcode-simctl");
			const simulator = new libraryPath.XCodeSimctlSimulator();

			for (let attempt = 0; attempt < 30; attempt++) {
				const device = await simulator.getBootedDevice(...args);
				if (device) {
					return device;
				}
				await delay(500);
			}

			return simulator.getBootedDevice(...args);
		}
	}
});

Object.defineProperty(publicApi, "getRunningSimulators", {
	get: () => {
		return (...args: any[]) => {
			const libraryPath = require("./iphone-simulator-xcode-simctl");
			const simulator = new libraryPath.XCodeSimctlSimulator();
			return simulator.getBootedDevices(...args);
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

Object.defineProperty(publicApi, "launchApplication", {
	get: () => {
		return (...args: any[]) => {
			const libraryPath = require("./iphone-simulator");
			const obj = new libraryPath.iPhoneSimulator();
			return obj.run.apply(obj, args);
		}
	}
});

Object.defineProperty(publicApi, "printDeviceTypes", {
	get: () => {
		return (...args: any[]) => {
			const libraryPath = require("./iphone-simulator");
			const obj = new libraryPath.iPhoneSimulator();
			return obj.printDeviceTypes.apply(obj, args);
		}
	}
});

["installApplication",
	"uninstallApplication",
	"startApplication",
	"stopApplication",
	"run",
	"getDeviceLogProcess",
	"startSimulator",
	"getSimulatorName",
	"getDevices",
	"sendNotification"].forEach(methodName => {
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
