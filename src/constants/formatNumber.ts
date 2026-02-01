"use client";
const ranges = [
	{
		divider: 1e3,
		suffix: "K",
	},
	{
		divider: 1e6,
		suffix: "M",
	},
	{
		divider: 1e9,
		suffix: "B",
	},
];

const formatNumber = (input: number): string => {
	if (input === 0) return input.toString();
	else if (input < 1) return input.toFixed(4);

	input = input.toString().length > 5 ? parseFloat(input.toFixed(5)) : input;

	// if (input < 0) return input.toString();
	if (input < 999) return input.toString();

	for (let index = ranges.length - 1; index >= 0; index--) {
		if (input > ranges[index].divider) {
			let quotient = input / ranges[index].divider;

			if (quotient < 10) {
				quotient = Math.floor(quotient * 10) / 10;
			} else {
				quotient = Math.floor(quotient);
			}

			return quotient + ranges[index].suffix;
		}
	}

	return input.toString();
};

export default formatNumber;
