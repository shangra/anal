const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const constants = require('../../../constants');
const FizFieldsListClass = require('./FizFieldsList.class');
const FieldsAggregationsClass = require('./FieldsAggregations.class');

class FieldsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Fields';
        this.id = constants[name].id;
        this.component = constants[name].component;

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c', 's', 'd'],
            routes: constants[name].routes,
            parent: props.parent,
        };
    }

    /**
      * @public
      * 
      * @param {*} item 
      * @param {*} options 
      */
    async subTree(item, options = {}) {
        const children = [];

        const subTree = [FizFieldsListClass, FieldsAggregationsClass];

        const InfoserviseList = await Promise.all(
            subTree.map(entity => new entity({ owner_id: item.id, parent: this.props.parent }).tree(options))
        );

        children.push(...InfoserviseList);

        return children;
    }

    /**
     * @public
     * 
     * @param {object} field 
     * @param {string[]} owner 
     * @param {object[]} children 
     */
    parse(field, owner, children) {
        const fieldInfo = field.manifest.settings;

        const agg = new FieldsAggregationsClass({ owner_id: field.id });

        const aggregations = children
            .map(child => child.class === agg.component && agg.parse(child))
            .filter(i => i && !i.onoff);

        const dimensions = {
            field: fieldInfo.nameField,
            name: field.name,
            description: field.description,
            id: field.id,
            class_id: field.class_id,
            type: fieldInfo.type,
            groupTag: fieldInfo.groupTag,
            onoff: fieldInfo.onoff ?? false,
            infoservice_owner: owner,
            format: fieldInfo.format,
            aggrFunc: fieldInfo.aggrFunc,
            aggregations
        };

        return dimensions;
    }
}

module.exports = FieldsClass;
