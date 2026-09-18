const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const constants = require('../../../constants');
const InfoserviseListClass = require('./InfoserviseList.class');

class DimensionsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Dimensions';
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

        const subTree = [InfoserviseListClass];

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

        const dimensions = {
            field: fieldInfo.nameField,
            name: field.name,
            description: field.description,
            id: field.id,
            class_id: field.class_id,
            type: fieldInfo.type,
            groupTag: fieldInfo.groupTag,
            onoff: fieldInfo.onoff ?? false,
            totalsOnoff: fieldInfo.totalsOnoff ?? true,
            infoservice_owner: owner,
            dateDimension: fieldInfo?.dimensionType
                ? fieldInfo.dimensionType  === constants.DATE_DIMENSION : fieldInfo.dateDimension,
            accountDimension: fieldInfo?.dimensionType
                ? fieldInfo?.dimensionType === constants.ACCOUNT_DIMENSION : fieldInfo.accountDimension
        };

        return dimensions;
    }
}

module.exports = DimensionsClass;
