export const normalizeSpaces = (str: string) => str.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
