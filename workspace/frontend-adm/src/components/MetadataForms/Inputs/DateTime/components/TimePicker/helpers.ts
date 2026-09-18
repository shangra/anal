export const getValidTime = (time: string, maxValue: number) => {
    if (Number(time) > maxValue) return 0;
    if (Number(time) < 0) return maxValue;
    return Number(time);
};