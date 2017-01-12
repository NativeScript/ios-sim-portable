export function stringify(arr: string[], delimiter?: string): string {
	delimiter = delimiter || ", ";
	return arr.join(delimiter);
}

export function getCurrentEpochTime(): number {
	let dateTime = new Date();
	return dateTime.getTime();
}

export function sleep(ms: number): void {
	let startTime = getCurrentEpochTime();
	let currentTime = getCurrentEpochTime();
	while ((currentTime - startTime) < ms) {
		currentTime = getCurrentEpochTime();
	}
}