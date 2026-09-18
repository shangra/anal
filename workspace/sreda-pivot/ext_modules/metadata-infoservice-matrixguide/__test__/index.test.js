const convertSearchWhere = (where, attr) => {
    if (Array.isArray(where)) return where.map((item) => convertSearchWhere(item, attr));

    if (typeof where === 'object') {
        let res = {};

        delete where.__level__;

        if (where.$eq) {
            where = where.$eq;
        }

        if (typeof where === 'object') {
            for (const key in where) {
                res[key] = convertSearchWhere(where[key], attr);
            }
        } else {
            res = convertSearchWhere(where, attr);
        }

        return res;
    }

    const key = `${attr}__${getLevel(where)}`;

    return { [key]: where };
}

const getLevel = (str) => {
    const [rawLvl] = str.split('::');

    return rawLvl.replace('lvl_', '');
}

const where = {
    "$and": [
        "lvl_0::0",
        {
            "$or": [
                {
                    "$eq": "lvl_1::0::-100003", "__level__": 1
                },
                {
                    "$eq": "lvl_2::0::-100003::49924", "__level__": 2
                },
                {
                    "$eq": "lvl_2::0::-100003::14614", "__level__": 2
                }]
        }
    ]
};

const result = {
    "$and": [
        { "level__0": "lvl_0::0" },
        {
            "$or": [
                { "level__1": { "$eq": "lvl_1::0::-100003" } },
                { "level__2": { "$eq": "lvl_2::0::-100003::49924" } },
                { "level__2": { "$eq": "lvl_2::0::-100003::14614" } }
            ]
        }
    ]
}

const r = convertSearchWhere(where, "level");

console.log(JSON.stringify(r, null, 2));