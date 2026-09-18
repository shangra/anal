const Extensions = require("../../../../../core/class/Extensions.class");
const ApiError = require("../../../../../core/exceptions/ApiError");
const ProcessingClass = require("../Processing.class");

const MetadataClass = require('../../../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

const ProcessingModel = require("../models/Processing.model");

const constants = require("../../../constants");

/**
 * @typedef {import("../Processing.class").ProcessingOptionsI} ProcessingOptionsI
 * @typedef {import("../Processing.class").RefI} RefI
 */

class PrepareProcessingClass extends Extensions {
    /**
     * @public
     * 
     * @param {string} id - id процессинга
     * @param {ProcessingOptionsI} options - настройки периода по которому нужно расчитать 
     */
    async prepare(id, options) {
        if (!options.where) throw ApiError.BadRequest(`Не указан период расчета`);

        const meta = new ProcessingClass({ id });

        const item = await meta.getItem(id);

        const { Infoservices, TimeDimension } = await meta.tableInfo(meta, id, {});
        if (!TimeDimension) {
            throw ApiError.BadRequest(`Не указано измерение времени`);
        }

        options.attributes = [TimeDimension.nameField];
        options.group = [TimeDimension.nameField];

        const promise = Object.values(Infoservices).map(async (Infoservice) => {
            const values = await this.generatePeriodBody({
                infoserviceRef: Infoservice,
                processing: item,
                dateField: TimeDimension.nameField,
                options
            });

            for (const value of values) {
                try { await ProcessingModel.create(value, options); } catch (e) { console.error(e); }
            }
        })

        await Promise.all(promise);

        return { result: true };
    }

    /**
     * @private
     * 
     * @private
     * 
     * @param {{ infoserviceRef: RefI, processing: { id?: string, owner_id?: string }, dateField: string, options: ProcessingOptionsI }} param0
     */
    async generatePeriodBody({ infoserviceRef, processing, dateField, options }) {
        const meta = await Metadata.getInstance(infoserviceRef, {});

        const { rows } = await meta.read(infoserviceRef.value, {
            ...options,
            withOutCount: true,
            withOutRefs: true,
            transaction: null
        });

        return rows
            .map((row) => {
                if (!row[dateField]) return;

                const body = {
                    processing_id: processing.id,
                    layer_id: infoserviceRef.value,
                    cube_id: processing.owner_id,
                    settings: JSON.stringify({ ...options, transaction: null }),
                    status: constants.Statuses.pending,
                    date: row[dateField]
                };

                return body;
            })
            .filter(Boolean)
    }
}

module.exports = PrepareProcessingClass;
