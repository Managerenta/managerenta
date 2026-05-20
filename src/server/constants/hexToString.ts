export default function hexToString(hex: string): string | null {
	const hexWithoutPrefix = hex.slice(2);
	const decimalValue = parseInt(hexWithoutPrefix, 16);
	if (Number.isNaN(decimalValue)) return null;
	// const utf8String = String.fromCharCode(decimalValue);
	// return utf8String;
	return decimalValue.toString();
}
