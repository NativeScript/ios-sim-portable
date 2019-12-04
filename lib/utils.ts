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

export function deferPromise<T>(): IDeferPromise<T> {
	let resolve: (value?: T | PromiseLike<T>) => void;
	let reject: (reason?: any) => void;
	let isResolved = false;
	let isRejected = false;
	let promise: Promise<T>;
	let result: T | PromiseLike<T>;

	promise = new Promise<T>((innerResolve, innerReject) => {
		resolve = (value?: T | PromiseLike<T>) => {
			isResolved = true;
			result = value;

			return innerResolve(value);
		};

		reject = (reason?: any) => {
			isRejected = true;

			return innerReject(reason);
		};
	});

	return {
		promise,
		resolve,
		reject,
		isResolved: () => isResolved,
		isRejected: () => isRejected,
		isPending: () => !isResolved && !isRejected,
		getResult: () => result
	};
}
