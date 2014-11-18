export function stringify(arr: string[], delimiter?: string): string {
	delimiter = delimiter || ", ";
	return arr.join(delimiter);
}