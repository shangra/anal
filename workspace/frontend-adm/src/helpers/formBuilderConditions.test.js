/**
 * Тесты для evaluateCondition
 */
import { evaluateCondition } from './formBuilderConditions';

// Тесты
const tests = [
    {
        name: 'Простое $eq - true',
        rules: { priority: { $eq: 'high' } },
        values: { priority: 'high' },
        expected: true
    },
    {
        name: 'Простое $eq - false',
        rules: { priority: { $eq: 'high' } },
        values: { priority: 'low' },
        expected: false
    },
    {
        name: 'Простое $noteq - true',
        rules: { status: { $noteq: 'closed' } },
        values: { status: 'open' },
        expected: true
    },
    {
        name: 'Простое $noteq - false',
        rules: { status: { $noteq: 'closed' } },
        values: { status: 'closed' },
        expected: false
    },
    {
        name: '$and - все условия true',
        rules: { $and: { priority: { $eq: 'high' }, status: { $noteq: 'closed' } } },
        values: { priority: 'high', status: 'open' },
        expected: true
    },
    {
        name: '$and - одно условие false',
        rules: { $and: { priority: { $eq: 'high' }, status: { $noteq: 'closed' } } },
        values: { priority: 'high', status: 'closed' },
        expected: false
    },
    {
        name: '$and - оба условия false',
        rules: { $and: { priority: { $eq: 'high' }, status: { $noteq: 'closed' } } },
        values: { priority: 'low', status: 'closed' },
        expected: false
    },
    {
        name: '$or - одно условие true',
        rules: { $or: { priority: { $eq: 'high' }, status: { $eq: 'closed' } } },
        values: { priority: 'low', status: 'closed' },
        expected: true
    },
    {
        name: '$or - оба условия false',
        rules: { $or: { priority: { $eq: 'high' }, status: { $eq: 'closed' } } },
        values: { priority: 'low', status: 'open' },
        expected: false
    },
    {
        name: 'Без правил (null)',
        rules: null,
        values: { priority: 'high' },
        expected: true
    },
    {
        name: 'Пустые правила',
        rules: {},
        values: { priority: 'high' },
        expected: true
    },
    {
        name: 'null/undefined значения',
        rules: { priority: { $eq: null } },
        values: { priority: null },
        expected: true
    },
    {
        name: 'Строковое представление JSON',
        rules: JSON.stringify({ priority: { $eq: 'high' } }),
        values: { priority: 'high' },
        expected: true
    }
];

console.log('=== Тесты evaluateCondition ===\n');

let passed = 0;
let failed = 0;

tests.forEach(({ name, rules, values, expected }) => {
    try {
        const result = evaluateCondition(rules, values);
        const isSuccess = result === expected;
        
        if (isSuccess) {
            passed++;
            console.log(`✅ ${name}`);
        } else {
            failed++;
            console.error(`❌ ${name}`);
            console.error(`   Ожидалось: ${expected}, получено: ${result}`);
        }
    } catch (error) {
        failed++;
        console.error(`❌ ${name} - Ошибка: ${error.message}`);
    }
});

console.log(`\n=== Результат: ${passed} успешно, ${failed} провалено ===`);

if (failed === 0) {
    console.log('\n🎉 Все тесты пройдены!');
    process.exit(0);
} else {
    console.log('\n⚠️ Некоторые тесты провалены');
    process.exit(1);
}
