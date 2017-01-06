import childProcess = require("./child-process");
import errors = require("./errors");
import options = require("./options");
import * as _ from "lodash";

export class Simctl implements ISimctl {

	public launch(deviceId: string, appIdentifier: string): string {
		let args: string[] = [];
		if (options.waitForDebugger) {
			args.push("-w");
		}

		args = args.concat([deviceId, appIdentifier]);

		if (options.args) {
			let applicationArgs = options.args.trim().split(/\s+/);
			_.each(applicationArgs, (arg: string) => args.push(arg));
		}

		let result = this.simctlExec("launch", args);

		if (options.waitForDebugger) {
			console.log(`${appIdentifier}: ${result}`);
		}

		return result;
	}

	public install(deviceId: string, applicationPath: string): void {
		return this.simctlExec("install", [deviceId, applicationPath]);
	}

	public uninstall(deviceId: string, appIdentifier: string, opts?: any): void {
		return this.simctlExec("uninstall", [deviceId, appIdentifier], opts);
	}

	public notifyPost(deviceId: string, notification: string): void {
		return this.simctlExec("notify_post", [deviceId, notification]);
	}

	public getAppContainer(deviceId: string, appIdentifier: string): string {
		try {
			return this.simctlExec("get_app_container", [deviceId, appIdentifier]);
		} catch (e) {
			if (e.message.indexOf("No such file or directory") > -1) {
				return null;
			}
			throw e;
		}
	}

	public getDevices(): IDevice[] {
		let rawDevices = this.simctlExec("list", ["devices"]);

		// expect to get a listing like
		// -- iOS 8.1 --
		//     iPhone 4s (3CA6E7DD-220E-45E5-B716-1E992B3A429C) (Shutdown)
		//     ...
		// -- iOS 8.2 --
		//     iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
		//     ...
		// so, get the `-- iOS X.X --` line to find the sdk (X.X)
		// and the rest of the listing in order to later find the devices

		let deviceSectionRegex = /-- (iOS) (.+) --(\n    .+)*/mg;
		let match = deviceSectionRegex.exec(rawDevices);

		let matches: any[] = [];

		// make an entry for each sdk version
		while (match !== null) {
			matches.push(match);
			match = deviceSectionRegex.exec(rawDevices);
		}

		if (matches.length < 1) {
			errors.fail('Could not find device section. ' + match);
		}

		// get all the devices for each sdk
		let devices: IDevice[] = [];
		for (match of matches) {
			let sdk: string = match[2];

			// split the full match into lines and remove the first
			for (let line of match[0].split('\n').slice(1)) {
				// a line is something like
				//    iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
				// retrieve:
				//   iPhone 4s
				//   A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E
				//   Shutdown
				let lineRegex = /^    ([^\(]+) \(([^\)]+)\) \(([^\)]+)\)( \(([^\)]+)\))*/;
				let lineMatch = lineRegex.exec(line);
				if (lineMatch === null) {
					errors.fail('Could not match line. ' + line);
				}

				let available = lineMatch[4];
				if (available === null || available === undefined) {
					devices.push({
						name: lineMatch[1],
						id: lineMatch[2],
						fullId: "com.apple.CoreSimulator.SimDeviceType." + lineMatch[1],
						runtimeVersion: sdk,
						state: lineMatch[3]
					});
				}
			}
		}

		return devices;
	}

	private simctlExec(command: string, args: string[], opts?: any): any {
		let fullCommand = (["xcrun", "simctl", command].concat(args)).join(" ");
		return childProcess.execSync(fullCommand, opts);
	}
}
