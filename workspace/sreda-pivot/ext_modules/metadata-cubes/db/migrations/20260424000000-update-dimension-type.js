'use strict';

/** @typedef {import("sequelize").QueryInterface} QueryInterface */
/** @typedef {import("sequelize")} Sequelize */

module.exports = {
    /**
     * @param {QueryInterface} queryInterface
     * @param {Sequelize} Sequelize
     */
    up: async (queryInterface, Sequelize) => {
        const { sequelize } = queryInterface;
        const schema = process.env.DB_SCHEMA;

        return sequelize.transaction(async transaction => {
            // Получаем все записи Metadata с class_id Dimensions
            const dimensionsRecords = await sequelize.query(
                `SELECT id, manifest FROM "${schema}"."Metadata" 
                 WHERE class_id = '00234649-8eaa-4a3d-9adb-280b01fa8437'`,
                { type: Sequelize.QueryTypes.SELECT, transaction }
            );

            for (const record of dimensionsRecords) {
                if (!record.manifest) continue;

                let manifest = JSON.parse(record.manifest);

                let changed = false;

                // Проверяем только вложенный объект settings
                if (manifest.settings) {
                    let dateDimension = manifest.settings.dateDimension;
                    let accountDimension = manifest.settings.accountDimension;

                    // Добавляем только если одно из полей равно true
                    if (dateDimension === true || accountDimension === true) {
                        let dimensionType = null;

                        if (dateDimension === true) {
                            dimensionType = 'dateDimension';
                        } else if (accountDimension === true) {
                            dimensionType = 'accountDimension';
                        }

                        delete manifest.settings.dateDimension;
                        delete manifest.settings.accountDimension;
                        changed = true;

                        if (dimensionType) {
                            manifest.settings.dimensionType = dimensionType;
                        }
                    } else {
                        // Если оба false или не определены, просто удаляем старые поля (если есть)
                        if (manifest.settings.dateDimension !== undefined || manifest.settings.accountDimension !== undefined) {
                            delete manifest.settings.dateDimension;
                            delete manifest.settings.accountDimension;
                            changed = true;
                        }
                    }
                }

                if (changed) {
                    await sequelize.query(
                        `UPDATE "${schema}"."Metadata" 
                         SET manifest = :manifest, "updatedAt" = CURRENT_TIMESTAMP 
                         WHERE id = :id`,
                        {
                            replacements: {
                                manifest: JSON.stringify(manifest),
                                id: record.id
                            },
                            transaction
                        }
                    );
                }
            }
        });
    },
    /**
     * @param {QueryInterface} queryInterface
     * @param {Sequelize} Sequelize
     */
    down: async (queryInterface, Sequelize) => {
        const { sequelize } = queryInterface;
        const schema = process.env.DB_SCHEMA;

        return sequelize.transaction(async transaction => {
            // Получаем все записи Metadata с class_id Dimensions
            const dimensionsRecords = await sequelize.query(
                `SELECT id, manifest FROM "${schema}"."Metadata" 
                 WHERE class_id = '00234649-8eaa-4a3d-9adb-280b01fa8437'`,
                { type: Sequelize.QueryTypes.SELECT, transaction }
            );

            for (const record of dimensionsRecords) {
                if (!record.manifest) continue;

                let manifest = JSON.parse(record.manifest);

                let changed = false;

                if (manifest.settings) {
                    let dimensionType = manifest.settings.dimensionType;

                    // Если dimensionType = '0' или пустое - только удаляем, не добавляем старых полей
                    if (dimensionType === '0' || !dimensionType) {
                        delete manifest.settings.dimensionType;
                        changed = true;
                    } else if (dimensionType) {
                        let dateDimension = false;
                        let accountDimension = false;

                        if (dimensionType === 'dateDimension') {
                            dateDimension = true;
                        } else if (dimensionType === 'accountDimension') {
                            accountDimension = true;
                        }

                        delete manifest.settings.dimensionType;
                        changed = true;

                        manifest.settings.dateDimension = dateDimension;
                        manifest.settings.accountDimension = accountDimension;
                    }
                }

                if (changed) {
                    await sequelize.query(
                        `UPDATE "${schema}"."Metadata" 
                         SET manifest = :manifest, "updatedAt" = CURRENT_TIMESTAMP 
                         WHERE id = :id`,
                        {
                            replacements: {
                                manifest: JSON.stringify(manifest),
                                id: record.id
                            },
                            transaction
                        }
                    );
                }
            }
        });
    }
};
