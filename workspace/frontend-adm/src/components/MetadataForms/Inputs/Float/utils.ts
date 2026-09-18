export const getDecimalNumbersCount = (num: number) => {
	const numStr = num.toString();
	return numStr.includes(".") ? numStr.split(".")[1].length : 0;
};

export const getStepByFloat = (num: number) => {
	const countDecimalNumbers = getDecimalNumbersCount(num);
	return 10 ** -countDecimalNumbers;
};
