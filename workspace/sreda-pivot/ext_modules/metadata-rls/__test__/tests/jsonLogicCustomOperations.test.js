const jsonLogic = require("json-logic-js");
require("../../jsonLogicNotContains");

describe('jsonLogic Custom Operations - notContains', () => {
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
        ],
        rules: [
            "rule-001",
            "rule-002"
        ],
        groupsAD: [
            "ad-group-999"
        ]
    };

    describe('notContains', () => {
        test('роль не существует - true', () => {
            expect(jsonLogic.apply(
                { "notContains": [{ "var": "roles" }, "non-existent-role"] },
                userInfo
            )).toBe(true);
        });

        test('роль существует - false', () => {
            expect(jsonLogic.apply(
                { "notContains": [{ "var": "roles" }, "43106426-ffe3-4e1d-b623-6d210c6be0ff"] },
                userInfo
            )).toBe(false);
        });

        test('пустая строка - true', () => {
            expect(jsonLogic.apply(
                { "notContains": [{ "var": "roles" }, ""] },
                userInfo
            )).toBe(true);
        });

        test('группа не существует - true', () => {
            expect(jsonLogic.apply(
                { "notContains": [{ "var": "groups" }, "non-existent-group"] },
                userInfo
            )).toBe(true);
        });

        test('группа существует - false', () => {
            expect(jsonLogic.apply(
                { "notContains": [{ "var": "groups" }, "group-admin-123"] },
                userInfo
            )).toBe(false);
        });

        test('правило не существует - true', () => {
            expect(jsonLogic.apply(
                { "notContains": [{ "var": "rules" }, "non-existent-rule"] },
                userInfo
            )).toBe(true);
        });

        test('правило существует - false', () => {
            expect(jsonLogic.apply(
                { "notContains": [{ "var": "rules" }, "rule-002"] },
                userInfo
            )).toBe(false);
        });

        test('AD группа не существует - true', () => {
            expect(jsonLogic.apply(
                { "notContains": [{ "var": "groupsAD" }, "non-existent-ad"] },
                userInfo
            )).toBe(true);
        });

        test('AD группа существует - false', () => {
            expect(jsonLogic.apply(
                { "notContains": [{ "var": "groupsAD" }, "ad-group-999"] },
                userInfo
            )).toBe(false);
        });
    });

    describe('notContains в комбинациях', () => {
        test('AND - роль есть И группа отсутствует - true', () => {
            expect(jsonLogic.apply(
                {
                    "and": [
                        { "!": { "notContains": [{ "var": "roles" }, "39e6072c-4ae7-4f09-b00c-5b958dea1398"] } },
                        { "notContains": [{ "var": "groups" }, "restricted-group"] }
                    ]
                },
                userInfo
            )).toBe(true);
        });

        test('AND - роль есть И группа отсутствует - false (группа есть)', () => {
            expect(jsonLogic.apply(
                {
                    "and": [
                        { "!": { "notContains": [{ "var": "roles" }, "39e6072c-4ae7-4f09-b00c-5b958dea1398"] } },
                        { "notContains": [{ "var": "groups" }, "group-admin-123"] }
                    ]
                },
                userInfo
            )).toBe(false);
        });

        test('OR - роли нет ИЛИ группа отсутствует - true', () => {
            expect(jsonLogic.apply(
                {
                    "or": [
                        { "notContains": [{ "var": "roles" }, "non-existent"] },
                        { "notContains": [{ "var": "groups" }, "group-admin-123"] }
                    ]
                },
                userInfo
            )).toBe(true);
        });

        test('notContains для двух разных полей - AND', () => {
            expect(jsonLogic.apply(
                {
                    "and": [
                        { "notContains": [{ "var": "roles" }, "non-existent-1"] },
                        { "notContains": [{ "var": "rules" }, "non-existent-2"] }
                    ]
                },
                userInfo
            )).toBe(true);
        });
    });
});