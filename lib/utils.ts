import * as childProcess from "./child-process";

export function stringify(arr: string[], delimiter?: string): string {
	delimiter = delimiter || ", ";
	return arr.join(delimiter);
}

export function getCurrentEpochTime(): number {
	let dateTime = new Date();
	return dateTime.getTime();
}

export function sleep(seconds: number): void {
	childProcess.execSync(`sleep ${seconds}`);
}
