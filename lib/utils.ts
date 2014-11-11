export function isEmptyDictionary(dictionary: IDictionary<any>): boolean {
	return _.keys(dictionary).length === 0;
}

export function stringify(arr: string[], delimiter?: string): string {
	delimiter = delimiter || ", ";
	return arr.join(delimiter);
}