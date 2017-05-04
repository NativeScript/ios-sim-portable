import * as child_process from "child_process";

export function execSync(command: string, opts?: any): any {
	try {
		return child_process.execSync(command, opts);
	} catch (err) {
		if (opts && opts.skipError) {
			return err;
		} else {
			throw (new Error(`Error ${err.message} while executing ${command}.`));
		}
	}
}

export function spawnSync(command: string, args: string[], opts?: any): any {
	try {
		return child_process.spawnSync(command, args, opts);
	} catch (err) {
		if (opts && opts.skipError) {
			return err;
		} else {
			throw (new Error(`Error ${err.message} while executing ${command}.`));
		}
	}
}

export function spawn(command: string, args: string[], opts?: any): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		let capturedOut = "";
		let capturedErr = "";

		let childProcess = child_process.spawn(command, args);

		if (childProcess.stdout) {
			childProcess.stdout.on("data", (data: string) => {
				capturedOut += data;
			});
		}

		if (childProcess.stderr) {
			childProcess.stderr.on("data", (data: string) => {
				capturedErr += data;
			});
		}

		childProcess.on("close", (arg: any) => {
			var exitCode = typeof arg === 'number' ? arg : arg && arg.code;
			if (exitCode === 0) {
				resolve(capturedOut ? capturedOut.trim() : null);
			} else {
				if (opts && opts.skipError) {
					resolve(capturedErr);
				} else {
					reject(new Error(`Command ${command} with arguments ${args.join(" ")} failed with exit code ${exitCode}. Error output:\n ${capturedErr}`));
				}
			}
		});
	});
}