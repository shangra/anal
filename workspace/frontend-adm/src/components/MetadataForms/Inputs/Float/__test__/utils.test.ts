import { getDecimalNumbersCount, getStepByFloat } from 'components/MetadataForms/Inputs/Float/utils';

describe('Float utils', () => {
    describe('getDecimalNumbersCount', () => {
        it('должен вернуть 0 для целого числа', () => {
            expect(getDecimalNumbersCount(0)).toEqual(0);
            expect(getDecimalNumbersCount(42)).toEqual(0);
            expect(getDecimalNumbersCount(-100)).toEqual(0);
        });

        it('должен вернуть правильное количество десятичных знаков', () => {
            expect(getDecimalNumbersCount(0.5)).toEqual(1);
            expect(getDecimalNumbersCount(0.25)).toEqual(2);
            expect(getDecimalNumbersCount(0.123)).toEqual(3);
            expect(getDecimalNumbersCount(10.5)).toEqual(1);
            expect(getDecimalNumbersCount(10.25)).toEqual(2);
            expect(getDecimalNumbersCount(10.123)).toEqual(3);
            expect(getDecimalNumbersCount(-10.5)).toEqual(1);
            expect(getDecimalNumbersCount(-10.25)).toEqual(2);
        });

        it('должен вернуть правильное количество для больших чисел', () => {
            expect(getDecimalNumbersCount(1000.5)).toEqual(1);
            expect(getDecimalNumbersCount(1000.25)).toEqual(2);
            expect(getDecimalNumbersCount(1000.123)).toEqual(3);
            expect(getDecimalNumbersCount(1234567.89)).toEqual(2);
        });

        it('должен вернуть правильное количество для чисел с ведущими нулями в дробной части', () => {
            expect(getDecimalNumbersCount(0.05)).toEqual(2);
            expect(getDecimalNumbersCount(0.005)).toEqual(3);
            expect(getDecimalNumbersCount(0.0005)).toEqual(4);
        });

        it('должен вернуть правильное количество для очень маленьких чисел', () => {
            expect(getDecimalNumbersCount(0.00001)).toEqual(5);
            expect(getDecimalNumbersCount(0.000001)).toEqual(6);
        });
    });

    describe('getStepByFloat', () => {
        it('должен вернуть правильный шаг для числа с 1 десятичным знаком', () => {
            expect(getStepByFloat(0.5)).toEqual(0.1);
            expect(getStepByFloat(42.5)).toEqual(0.1);
            expect(getStepByFloat(-10.5)).toEqual(0.1);
        });

        it('должен вернуть правильный шаг для числа с 2 десятичными знаками', () => {
            expect(getStepByFloat(0.25)).toEqual(0.01);
            expect(getStepByFloat(42.25)).toEqual(0.01);
            expect(getStepByFloat(-10.25)).toEqual(0.01);
        });

        it('должен вернуть правильный шаг для числа с 3 десятичными знаками', () => {
            expect(getStepByFloat(0.123)).toEqual(0.001);
            expect(getStepByFloat(42.123)).toEqual(0.001);
            expect(getStepByFloat(-10.123)).toEqual(0.001);
        });

        it('должен вернуть 1 для целого числа', () => {
            expect(getStepByFloat(0)).toEqual(1);
            expect(getStepByFloat(42)).toEqual(1);
            expect(getStepByFloat(-100)).toEqual(1);
        });

    });
});
