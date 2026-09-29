export const getYearsRange = (startYear: number, endYear: number) =>
    startYear > endYear
        ? [startYear]
        : Array(endYear - startYear + 1)
              .fill(null)
              .map((_, idx) => startYear + idx)
              .reverse();
