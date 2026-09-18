import { convertFiltersToWhereOptions } from "components/MetadataForms/Buttons/FilterWindow/convertRuleToQuery";

describe('convertFiltersToWhereOptions', () => {
    describe('empty cases', () => {
        it('should return undefined for empty filters', () => {
            expect(convertFiltersToWhereOptions(null)).toBeUndefined();
            expect(convertFiltersToWhereOptions(undefined)).toBeUndefined();
            expect(convertFiltersToWhereOptions({})).toBeUndefined();
        });

        it('should return undefined for filters with empty rules', () => {
            expect(convertFiltersToWhereOptions({ rules: [] })).toBeUndefined();
            expect(convertFiltersToWhereOptions({ rules: null })).toBeUndefined();
        });
    });

    describe('single rule conversion', () => {
        it('should convert simple rule with basic field', () => {
            const filters = {
                rules: [{
                    fieldName: 'name',
                    operator: '$eq',
                    value: 'John'
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({ name: { $eq: 'John' } });
        });

        it('should convert rule with dot notation field', () => {
            const filters = {
                rules: [{
                    fieldName: 'users.name',
                    operator: '$like',
                    value: 'John%'
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({ 'users.name': { $like: 'John%' } });
        });

        it('should return undefined for rule with empty value', () => {
            const filters = {
                rules: [{
                    fieldName: 'name',
                    operator: '$eq',
                    value: ''
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toBeUndefined();
        });

        it('should return undefined for rule with undefined value', () => {
            const filters = {
                rules: [{
                    fieldName: 'name',
                    operator: '$eq',
                    value: undefined
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toBeUndefined();
        });

        it('should return undefined for rule with empty array value', () => {
            const filters = {
                rules: [{
                    fieldName: 'tags',
                    operator: '$in',
                    value: []
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toBeUndefined();
        });

        it('should return undefined for rule with empty object value', () => {
            const filters = {
                rules: [{
                    fieldName: 'data',
                    operator: '$eq',
                    value: {}
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toBeUndefined();
        });
    });

    describe('link rule conversion', () => {
        it('should convert link rule with basic field', () => {
            const filters = {
                rules: [{
                    fieldName: 'userId',
                    operator: '$eq',
                    value: '123',
                    link: 'users.id',
                    type: 'ref'
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({
                userId: {
                    $eq: {
                        link: 'users.id',
                        value: '123',
                        type: 'ref'
                    }
                }
            });
        });

        it('should convert link rule with dot notation field', () => {
            const filters = {
                rules: [{
                    fieldName: 'profile.userId',
                    operator: '$ne',
                    value: '456',
                    link: 'users.id',
                    type: 'ref'
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({
                'profile.userId': {
                    $ne: {
                        link: 'users.id',
                        value: '456',
                        type: 'ref'
                    }
                }
            });
        });
    });

    describe('group conversion', () => {
        it('should convert AND group with multiple rules', () => {
            const filters = {
                combinator: '$and',
                rules: [
                    { fieldName: 'name', operator: '$eq', value: 'John' },
                    { fieldName: 'age', operator: '$gt', value: 25 }
                ]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({
                $and: [
                    { name: { $eq: 'John' } },
                    { age: { $gt: 25 } }
                ]
            });
        });

        it('should convert OR group with multiple rules', () => {
            const filters = {
                combinator: '$or',
                rules: [
                    { fieldName: 'status', operator: '$eq', value: 'active' },
                    { fieldName: 'verified', operator: '$eq', value: true }
                ]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({
                $or: [
                    { status: { $eq: 'active' } },
                    { verified: { $eq: true } }
                ]
            });
        });

        it('should filter out empty rules in group', () => {
            const filters = {
                combinator: '$and',
                rules: [
                    { fieldName: 'name', operator: '$eq', value: 'John' },
                    { fieldName: 'email', operator: '$eq', value: '' }, // empty value
                    { fieldName: 'age', operator: '$gt', value: 25 }
                ]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({
                $and: [
                    { name: { $eq: 'John' } },
                    { age: { $gt: 25 } }
                ]
            });
        });

        it('should return single rule when group has only one valid rule', () => {
            const filters = {
                combinator: '$and',
                rules: [
                    { fieldName: 'name', operator: '$eq', value: 'John' },
                    { fieldName: 'email', operator: '$eq', value: '' } // empty value
                ]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({ name: { $eq: 'John' } });
        });

        it('should return undefined when all rules in group are empty', () => {
            const filters = {
                combinator: '$and',
                rules: [
                    { fieldName: 'name', operator: '$eq', value: '' },
                    { fieldName: 'email', operator: '$eq', value: undefined }
                ]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toBeUndefined();
        });

        describe('group edge cases', () => {
            it('should return undefined for group with no rules', () => {
                const filters = {
                    combinator: '$and',
                    rules: []
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toBeUndefined();
            });

            it('should return undefined for group with null rules', () => {
                const filters = {
                    combinator: '$and',
                    rules: null
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toBeUndefined();
            });

            it('should return undefined for group with undefined rules', () => {
                const filters = {
                    combinator: '$and'
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toBeUndefined();
            });

            it('should handle nested empty groups', () => {
                const filters = {
                    combinator: '$and',
                    rules: [
                        { fieldName: 'name', operator: '$eq', value: 'John' },
                        {
                            combinator: '$or',
                            rules: [] // empty nested group
                        }
                    ]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({ name: { $eq: 'John' } });
            });

            it('should handle deeply nested empty groups', () => {
                const filters = {
                    combinator: '$and',
                    rules: [
                        { fieldName: 'name', operator: '$eq', value: 'John' },
                        {
                            combinator: '$or',
                            rules: [
                                {
                                    combinator: '$and',
                                    rules: [] // empty deeply nested group
                                },
                                { fieldName: 'status', operator: '$eq', value: 'active' }
                            ]
                        }
                    ]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({
                    $and: [
                        { name: { $eq: 'John' } },
                        { status: { $eq: 'active' } }
                    ]
                });
            });

            it('should handle group with mixed valid and invalid nested groups', () => {
                const filters = {
                    combinator: '$and',
                    rules: [
                        { fieldName: 'name', operator: '$eq', value: 'John' },
                        {
                            combinator: '$or',
                            rules: [] // empty group - should be filtered out
                        },
                        {
                            combinator: '$and',
                            rules: [
                                { fieldName: 'age', operator: '$gt', value: 18 },
                                { fieldName: 'email', operator: '$eq', value: '' } // empty value
                            ]
                        }
                    ]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({
                    $and: [
                        { name: { $eq: 'John' } },
                        { age: { $gt: 18 } }
                    ]
                });
            });
        });
    });

    describe('nested groups', () => {
        it('should convert nested groups', () => {
            const filters = {
                combinator: '$and',
                rules: [
                    { fieldName: 'name', operator: '$eq', value: 'John' },
                    {
                        combinator: '$or',
                        rules: [
                            { fieldName: 'status', operator: '$eq', value: 'active' },
                            { fieldName: 'role', operator: '$eq', value: 'admin' }
                        ]
                    }
                ]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({
                $and: [
                    { name: { $eq: 'John' } },
                    {
                        $or: [
                            { status: { $eq: 'active' } },
                            { role: { $eq: 'admin' } }
                        ]
                    }
                ]
            });
        });

        it('should handle deeply nested groups', () => {
            const filters = {
                combinator: '$and',
                rules: [
                    { fieldName: 'name', operator: '$eq', value: 'John' },
                    {
                        combinator: '$or',
                        rules: [
                            { fieldName: 'status', operator: '$eq', value: 'active' },
                            {
                                combinator: '$and',
                                rules: [
                                    { fieldName: 'age', operator: '$gt', value: 18 },
                                    { fieldName: 'verified', operator: '$eq', value: true }
                                ]
                            }
                        ]
                    }
                ]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({
                $and: [
                    { name: { $eq: 'John' } },
                    {
                        $or: [
                            { status: { $eq: 'active' } },
                            {
                                $and: [
                                    { age: { $gt: 18 } },
                                    { verified: { $eq: true } }
                                ]
                            }
                        ]
                    }
                ]
            });
        });
    });

    describe('edge cases', () => {
        it('should handle array with values', () => {
            const filters = {
                rules: [{
                    fieldName: 'tags',
                    operator: '$in',
                    value: ['js', 'ts', 'react']
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({ tags: { $in: ['js', 'ts', 'react'] } });
        });

        it('should handle boolean values', () => {
            const filters = {
                rules: [{
                    fieldName: 'active',
                    operator: '$eq',
                    value: true
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({ active: { $eq: true } });
        });

        it('should handle number values', () => {
            const filters = {
                rules: [{
                    fieldName: 'count',
                    operator: '$gte',
                    value: 10
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({ count: { $gte: 10 } });
        });

        it('should handle null values', () => {
            const filters = {
                rules: [{
                    fieldName: 'deletedAt',
                    operator: '$eq',
                    value: null
                }]
            };

            const result = convertFiltersToWhereOptions(filters);
            expect(result).toEqual({ deletedAt: { $eq: null } });
        });
    });

    describe('$ne boolean operator special cases', () => {
        describe('$ne boolean without link and type', () => {
            it('should convert $ne boolean for simple field to OR with null check', () => {
                const filters = {
                    rules: [{
                        fieldName: 'isActive',
                        operator: '$ne',
                        value: true
                    }]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({
                    $or: [
                        { isActive: { $ne: true } },
                        { isActive: null }
                    ]
                });
            });

            it('should convert $ne boolean for dot notation field to OR with null check', () => {
                const filters = {
                    rules: [{
                        fieldName: 'user.isActive',
                        operator: '$ne',
                        value: false
                    }]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({
                    $or: [
                        { 'user.isActive': { $ne: false } },
                        { 'user.isActive': null }
                    ]
                });
            });

            it('should not apply OR logic for $ne with non-boolean values', () => {
                const filters = {
                    rules: [{
                        fieldName: 'name',
                        operator: '$ne',
                        value: 'John'
                    }]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({ name: { $ne: 'John' } });
            });
        });

        describe('$ne boolean with link and type', () => {
            it('should convert $ne boolean with link to OR with null check for simple field', () => {
                const filters = {
                    rules: [{
                        fieldName: 'isVerified',
                        operator: '$ne',
                        value: true,
                        link: 'verification.status',
                        type: 'ref'
                    }]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({
                    $or: [
                        {
                            isVerified: {
                                $ne: {
                                    link: 'verification.status',
                                    value: true,
                                    type: 'ref'
                                }
                            }
                        },
                        {
                            isVerified: {
                                $eq: {
                                    link: 'verification.status',
                                    value: null,
                                    type: 'ref'
                                }
                            }
                        }
                    ]
                });
            });

            it('should convert $ne boolean with link to OR with null check for dot notation field', () => {
                const filters = {
                    rules: [{
                        fieldName: 'profile.isActive',
                        operator: '$ne',
                        value: false,
                        link: 'users.active',
                        type: 'ref'
                    }]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({
                    $or: [
                        {
                            'profile.isActive': {
                                $ne: {
                                    link: 'users.active',
                                    value: false,
                                    type: 'ref'
                                }
                            }
                        },
                        {
                            'profile.isActive': {
                                $eq: {
                                    link: 'users.active',
                                    value: null,
                                    type: 'ref'
                                }
                            }
                        }
                    ]
                });
            });

            it('should not apply OR logic for $ne with link and non-boolean values', () => {
                const filters = {
                    rules: [{
                        fieldName: 'userId',
                        operator: '$ne',
                        value: '123',
                        link: 'users.id',
                        type: 'ref'
                    }]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({
                    userId: {
                        $ne: {
                            link: 'users.id',
                            value: '123',
                            type: 'ref'
                        }
                    }
                });
            });
        });

        describe('$ne boolean in groups', () => {
            it('should handle $ne boolean in AND group', () => {
                const filters = {
                    combinator: '$and',
                    rules: [
                        { fieldName: 'isActive', operator: '$ne', value: true },
                        { fieldName: 'name', operator: '$eq', value: 'John' }
                    ]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({
                    $and: [
                        {
                            $or: [
                                { isActive: { $ne: true } },
                                { isActive: null }
                            ]
                        },
                        { name: { $eq: 'John' } }
                    ]
                });
            });

            it('should handle $ne boolean with link in OR group', () => {
                const filters = {
                    combinator: '$or',
                    rules: [
                        {
                            fieldName: 'isVerified',
                            operator: '$ne',
                            value: false,
                            link: 'verification.status',
                            type: 'ref'
                        },
                        { fieldName: 'status', operator: '$eq', value: 'active' }
                    ]
                };

                const result = convertFiltersToWhereOptions(filters);
                expect(result).toEqual({
                    $or: [
                        {
                            $or: [
                                {
                                    isVerified: {
                                        $ne: {
                                            link: 'verification.status',
                                            value: false,
                                            type: 'ref'
                                        }
                                    }
                                },
                                {
                                    isVerified: {
                                        $eq: {
                                            link: 'verification.status',
                                            value: null,
                                            type: 'ref'
                                        }
                                    }
                                }
                            ]
                        },
                        { status: { $eq: 'active' } }
                    ]
                });
            });
        });
    });
});