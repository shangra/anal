const Extensions = require('../../../core/class/Extensions.class');
// const { sequelize } = sreda.models; //нельзя использовать sequelize
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

class MetaCopyPasteService extends Extensions {
    async formAfter(innerResult, functionInput) {
        const { id } = functionInput;

        if (!innerResult.buttons) {
            innerResult.buttons = [];
        }
        innerResult.buttons.push({
            name: 'MetaCopy',
            component: 'MetaCopyPaste',
            props: {
                type: 'copy',
                server: sreda.env.ESB_NAME || '',
                service: `metadata/metacopypaste/copy/${id}`,
                title: 'Скопировать данные объекта метаданных',
            },
        });
        innerResult.buttons.push({
            name: 'MetaPaste',
            component: 'MetaCopyPaste',
            props: {
                type: 'paste',
                server: sreda.env.ESB_NAME || '',
                service: `metadata/metacopypaste/paste/${id}`,
                title: 'Вставить данные объекта метаданных',
            },
        });

        return innerResult;
    }

    /**
     * @param {string} id
     */
    async copy(id) {
        const mData = await Metadata.getMetadata(id);
        return { result: mData };
    }

    async changeValues(value, replacedValues) {
        const replacedKeys = Object.keys(replacedValues);

        let newValue = value;
        if (typeof value !== 'object') {
            // Это обычный примитив можно без фанатизма
            if (replacedKeys.includes(value)) {
                // Если нашли значение в настройках, то нужно его поменять
                newValue = replacedValues[value];
            }
        } else if (!Array.isArray(value)) {
            // Это сложный объект
            newValue = {};
            for (const keySettings in value) {
                newValue[keySettings] = await this.changeValues(
                    value[keySettings],
                    replacedValues
                );
            }
        } else if (Array.isArray(value)) {
            // Это массив
            newValue = [];
            for (const val of value) {
                newValue.push(await this.changeValues(val, replacedValues));
            }
        }

        return newValue;
    }

    async pasteChildren(newOwner, items, pasted) {
        if (items?.length) {
            for (const item of items) {
                let newLocalOwner = newOwner;

                if (item.id !== item.class_id) {
                    let { manifest } = await Metadata.getItem(item.id);

                    delete manifest.id;
                    delete manifest.settings.id;

                    const data = {
                        ...manifest,
                        owner_id: newLocalOwner,
                        class_id: item.class_id,
                        class: item.class,
                        name: item.name,
                        description: item.description,
                    };

                    const { id } = await Metadata.setMetadata(data);

                    newLocalOwner = id;
                    pasted[item.id] = {
                        ...data,
                        settings: { ...data.settings, id },
                        id,
                    };

                    await Metadata.updMetadata(
                        pasted[item.id].id,
                        pasted[item.id]
                    );
                }

                await this.pasteChildren(newLocalOwner, item.children, pasted);
            }
        }
    }

    async paste(id, body) {
        return this._paste(id, body);
        // return sequelize.transaction(() => this._paste(id, body));
    }

    async _paste(id, body) {
        let mData = await Metadata.getMetadata(id);

        if (body.result) {
            // Сперва всё удалим
            const children = mData.children.map((classes) => {
                if (classes.children) {
                    classes.children.map((item) => {
                        Metadata.delMetadata(item.id);
                    });
                }
            });
            await Promise.all(children);

            // Заполняем настройки самих метаданных
            await Metadata.updMetadata(mData.id, {
                ...mData.manifest,
                settings: { ...body.result.manifest.settings, id: mData.id },
            });

            // Теперь создадим всех потомков
            const pasted = {};
            for (const classes of body.result.children) {
                await this.pasteChildren(mData.id, classes.children, pasted);
            }

            // Обновляем ссылки
            const replacedValues = Object.fromEntries(
                Object.entries(pasted).map(([k, v]) => [k, v.id])
            );
            for (const oldId in pasted) {
                const newSettings = await this.changeValues(
                    pasted[oldId].settings,
                    replacedValues
                );

                // Не лучший способ, но снижает кол-во запросов к БД
                if (
                    JSON.stringify(pasted[oldId].settings) !==
                    JSON.stringify(newSettings)
                ) {
                    pasted[oldId].settings = newSettings;

                    await Metadata.updMetadata(pasted[oldId].id, pasted[oldId]);
                }
            }
        }

        mData = await Metadata.getMetadata(id);

        return { result: mData };
    }
}

module.exports = MetaCopyPasteService;
