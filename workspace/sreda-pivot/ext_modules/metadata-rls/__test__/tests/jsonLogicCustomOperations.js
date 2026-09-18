const jsonLogic = require("json-logic-js");

require("../../jsonLogicNotContains.js");

// Тестовые данные
const userInfo = {
    roles: [
        "bb38d4d1-baa0-41cd-ab48-248e484d4c47",
        "04bdd7f9-e058-4223-9279-3300fac1bb55",
        "c5d8bae1-f106-4f5b-b61c-73d649b98257",
        "39e6072c-4ae7-4f09-b00c-5b958dea1398",
        "43106426-ffe3-4e1d-b623-6d210c6be0ff"
    ],
    groups: [
        "group-admin-123",
        "group-users-456"
    ]
};

// Функция для запуска тестов
function runTest(name, condition, expected) {
    const result = jsonLogic.apply(condition, userInfo);
    const status = result === expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}`);
    if (result !== expected) {
        console.log(`   Expected: ${expected}, got: ${result}`);
    }
}

// Запуск тестов notContains
console.log('\n=== notContains tests ===\n');

runTest('роль не существует - true',
    { "notContains": [{ "var": "roles" }, "non-existent-role"] },
    true
);

runTest('роль существует - false',
    { "notContains": [{ "var": "roles" }, "43106426-ffe3-4e1d-b623-6d210c6be0ff"] },
    false
);

runTest('пустая строка - true',
    { "notContains": [{ "var": "roles" }, ""] },
    true
);

runTest('группа не существует - true',
    { "notContains": [{ "var": "groups" }, "non-existent-group"] },
    true
);

runTest('группа существует - false',
    { "notContains": [{ "var": "groups" }, "group-admin-123"] },
    false
);

console.log('\n=== done ===\n');