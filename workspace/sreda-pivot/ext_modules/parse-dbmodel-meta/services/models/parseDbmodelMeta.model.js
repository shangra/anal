const { parseDbmodelMeta } = sreda.models;

class parseDbmodelMetaModel {
    static async get(id) {
        return parseDbmodelMeta.findOne({ where: { id: id } });
    }

    static async new(body) {
        const result = await parseDbmodelMeta.create(body);
        return result;
    }

    static async update(id, data) {
        await parseDbmodelMeta.update(data, { where: { id } });
        return { result: true };
    }

    static async del(id) {
        await parseDbmodelMeta.destroy({ where: { id } });
        return { result: true };
    }
}

module.exports = parseDbmodelMetaModel;
