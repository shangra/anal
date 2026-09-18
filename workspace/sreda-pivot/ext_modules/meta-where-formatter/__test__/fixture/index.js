const normalize = [
    {
        input: {
            id: 10,
            parent: { $eq: 15 },
        },
        output: {
            id: 10,
            parent: { $or: [{ $eq: 15 }] },
        },
    },
    {
        input: { id: [1, 2, 3] },
        output: { id: [1, 2, 3] },
    },
    {
        input: {
            ['$and']: [
                {
                    ['$or']: [{ id: 10 }, { id: 15 }],
                    ['$and']: [{ parent: { $ne: 17 } }, { parent: { $ne: 26 } }],
                },
            ],
        },
        output: {
            id: [10, 15],
            parent: { ['$and']: [{ $ne: 17 }, { $ne: 26 }] },
        },
    },
];

const removeLevel = [
    {
        input: {
            id: { $eq: 10, __level__: 1 },
            parent: [{ $ne: 10, __level__: 1 }],
            $and: [{ item: { $eq: 10, __level__: 1 } }],
        },
        output: {
            id: { $eq: 10 },
            parent: [{ $ne: 10 }],
            $and: [{ item: { $eq: 10 } }],
        },
    },
];

module.exports = {
    normalize,
    removeLevel,
};
