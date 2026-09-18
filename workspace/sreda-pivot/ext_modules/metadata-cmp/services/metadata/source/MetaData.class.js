const LevelClass = require('./LevelClass.class');

class MetaData extends LevelClass {
    constructor(props = {}) {
        super(props);

        this.id = '00000000-0000-0000-0000-000000000000';
        this.component = 'Metadata';
        this.props = {
            id: this.id,
            name: 'Метаданные',
            description: 'Метаданные',
            crud: ['rls'],
        };
    }

    async generateLevels() {
        return {
            id: this.id,
            component: this.component,
            props: this.props,
            children: this.children ?? [],
        };
    }

    async render() {
        await this.generateLevels();
        return this;
    }
}

module.exports = MetaData;
