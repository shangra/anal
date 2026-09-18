const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const AggregationsClass = require('./Aggregations.class');
const constants = require('../../../constants');

class MeasuresClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Measures';
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

        const subTree = [AggregationsClass]

        const InfoserviseList = await Promise.all(
            subTree.map(entity => new entity({ owner_id: item.id, parent: this.props.parent }).tree(options))
        );

        children.push(...InfoserviseList);

        return children;
    }
}

module.exports = MeasuresClass;
