const { isEmptyObject } = require('../../../../../utils/services');

const CaseClass = require('./Case.class');

/**
 * @typedef {import('../../../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../../../../db/rls/types/WhereOptions.d.ts").WhereOptions} WhereOptions
 * @typedef {import("../behaviour/types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../behaviour/types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../behaviour/types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../behaviour/types/index").ILevel} ILevel
 * @typedef {import("../../../../../../db/rls/types/WhereOptions").Where} Where
 */

/**
 * TODO: подчистить класс - очень много лишней логики и дублирующегося кода
 * + проблемы с логикой - принят максимально простой подход из за которого в выборки попадает большое количество лишних данных
 * + усложняется парс для финального конверта в формат орм
 */

/**
 * Поведение реализованое через представление
 */
class ViewClass extends CaseClass {
    constructor({ refItem, meta, connector, table, field, delimeter }) {
        super({ refItem, meta, table, field, delimeter });
        /** @type {IConnector} */
        this.connector = connector;
    }

    /** @type {number} */
    maxLevel;

    /**
     * Формирование рекурсивных опций
     *
     * @public
     * @param {IBehaviourQueryOptions} options - Данные для SQL
     * @param {string} key - Атрибут
     * @param {string} viewName - Имя представления
     *
     * @returns {Promise<object>}
     */
    async getSubQuery(options, key, viewName) {
        const { where, systemWhere } = options;
        // уровень вложенности для обрабатываемого атрибута:
        this.maxLevel = await this.getLevelsForAttribute(this.table, this.refItem.field); // максимальный
        if (!this.maxLevel || !this.isHierarchy) {
            return super.getSubQuery(options, key, viewName);
        }

        /** @type {ILevel[]} */
        const mainField = [{ attribute: this.refItem.field, field: this.field.value }];
        /** @type {ILevel[]} */
        this.values = [];

        const level = this.getLvl({
            where,
            systemWhere,
            attribute: this.refItem.field,
            isVisible: true,
        }); // текущий

        /**
         * TODO: костыль который уменьшает выборку полей после фикса фронта с нормальной передачей уровней убрать
         */
        if (isEmptyObject(where)) {
            // если в пользовательских фильтрах ничего нет, то нас интересует только текущий уровень и предыдущий
            // т.е. в systemWhere приносим только атрибут текущего уровня и предыдущего
            for (
                let index = Math.max(0, level - 1);
                index <= Math.min(level, this.maxLevel - 1);
                index++
            ) {
                const attr = `${this.refItem.field}__lvl_${index}`;
                this.values.push({
                    attribute: attr,
                    field: attr,
                    where: {},
                });
            }
        } else {
            // иначе обрабатываем все уровни
            for (let i = 0; i < this.maxLevel; ++i) {
                const attr = `${this.refItem.field}__lvl_${i}`;
                this.values.push({
                    attribute: attr,
                    field: attr,
                    where: {},
                });
            }
        }

        return { current: [...mainField, ...this.values], after: this.values };
    }

    /**
     * Формирование опций представления
     *
     * @param {{ dictionaryWhere, systemWhere, where, settings }} options - Данные для SQL
     * @param { string } attribute - Атрибут
     * @param { string } viewName - Имя представления
     *
     * @returns { Promise<Object> }
     */
    async query(options, attribute, viewName) {
        if (!this.maxLevel) {
            //TODO: костыль
            this.pkData = super.pkData;
            this.generate = super.generate;

            return super.query(options, attribute, viewName);
        }

        const { dictionaryWhere, systemWhere, where } = options;

        this.id = typeof this.refItem.ref === 'object' ? this.refItem.ref.value : this.refItem.ref;

        const [item, treeObject] = await Promise.all([
            this.meta.getItem(this.id),
            this.meta.tableInfo(this.meta, this.id),
        ]);

        /**
         * получим текущий уровень расскрытия
         */
        const level = this.getLvl({ where: {}, systemWhere, attribute, isVisible: false });

        const check = await this.isValidForQuery({ level, treeObject, attribute });
        if (check) return check;

        const { pkName, parentFilter } = this.getRefConfig(treeObject, item);

        /**
         * специфичный парент для денормализованных вьюх
         */
        const localParentFilter = parentFilter?.$eq ? parentFilter : { $ne: null };

        /**
         * TODO: убрать this
         */
        this.viewName = viewName;
        this.pkName = pkName;
        this.where = where;
        this.systemWhere = systemWhere;
        this.attribute = attribute;

        return this.viewName
            ? this.pkData()
            : this.generate(
                  {
                      where,
                      dictionaryWhere: dictionaryWhere[attribute] ?? {},
                      postWhere: systemWhere ?? {},
                      parentFilter: localParentFilter,
                  },
                  attribute
              );
    }

    /**
     * @private
     *
     * @param {*} param0
     * @param {*} attribute
     * @returns {Promise<IBehaviourOptions>}
     */
    async generate({ where, dictionaryWhere, postWhere: systemWhere, parentFilter }, attribute) {
        //TODO переделать на работу через __level__ а не сканированием через все уровни
        const level = this.getLvl({ where, systemWhere, attribute, isVisible: true });

        if (level >= this.maxLevel) {
            return {
                before: [
                    {
                        attribute,
                        field: attribute,
                        //условие выброс - при такой записи будет запрос типа `SELECT * FROM table WHERE 1 <> 1` и не вернется данных
                        where: this.isHierarchy ? { [attribute]: [] } : {},
                    },
                ],
            };
        }

        const localWhere = where[attribute]?.__parent__ ?? where[attribute];
        const localSystemWhere = systemWhere[attribute]?.__parent__ ?? systemWhere[attribute];

        const lvlWhere = {};
        const dictWhere = {};
        const sysLvlWhere = {};
        /**
         * если это первый уровень раскрытия и нет пользовательских фильтров накидываем дефолтный фильтр иерерахии
         */
        if (!level && !localWhere) {
            this.addConditionToLevel(lvlWhere, attribute, 0, parentFilter);
        }

        if (localWhere) {
            for (let currentLvl = 0; currentLvl < this.maxLevel; currentLvl++) {
                this.addConditionToLevel(lvlWhere, attribute, currentLvl, localWhere);
            }
        }

        if (localSystemWhere) {
            this.addConditionToLevel(sysLvlWhere, attribute, level - 1, localSystemWhere, '$and');
        }

        if (!isEmptyObject(dictionaryWhere)) {
            const { keys } = await this.getRows({
                where: dictionaryWhere ?? {},
                pkName: this.pkName,
            });

            dictWhere[attribute] = keys;
        }

        const mergedWhere = { ['$and']: [] };

        if (!isEmptyObject(lvlWhere?.[attribute] ?? {})) {
            mergedWhere.$and.push(lvlWhere[attribute]);
        }

        if (!isEmptyObject(sysLvlWhere?.[attribute] ?? {})) {
            mergedWhere.$and.push(sysLvlWhere[attribute]);
        }

        if (!isEmptyObject(dictWhere?.[attribute] ?? {})) {
            mergedWhere.$and.push({ [attribute]: dictWhere[attribute] });
        }

        const before = [
            {
                attribute,
                field: `"${attribute}__lvl_${level}"`,
                where: mergedWhere,
            },
        ];

        return {
            before,
            current: [
                {
                    where: { [attribute]: { $ne: null } },
                },
            ],
        };
    }

    /**
     *
     * @param {object} option
     * @param {string} attribute
     * @param {number} level
     * @param {object} where
     * @param {string} [type]
     */
    addConditionToLevel(option, attribute, level, where, type = '$or') {
        option[attribute] ??= {};
        option[attribute][type] ??= [];
        option[attribute][type].push({ [`${attribute}__lvl_${level}`]: where });
    }

    /**
     * получить максимальное количество уровней
     *
     * @param {string} table
     * @param {string} attribute
     * @returns {Promise<number>}
     */
    async getLevelsForAttribute(table, attribute) {
        const [row = {}] = await this.connector.findAll(table, {
            limit: 1,
            attributes: ['*'],
            where: {},
        });

        return Object.keys(row).filter((columnName) => columnName.startsWith(`${attribute}__lvl`))
            .length;
    }
}

module.exports = ViewClass;
