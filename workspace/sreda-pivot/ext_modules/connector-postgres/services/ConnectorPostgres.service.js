const Connector = require('../../metadata-connector/services/metadata/connectors/Postgres');

class ConnectorPostgres {
    async loadConnectorsBefore(res, params) {
        const list =
            params?.ConnectorList ||
            params?.list ||
            (res && typeof res === 'object' && !Array.isArray(res) ? res : null);
        if (list && typeof list === 'object') {
            list.postgres = Connector;
        }
        return res;
    }

    async formAfter(res, params) {
        const form = res?.form;
        if (form?.[0]?.props?.tabs?.[0]?.content?.[0]?.list) {
            form[0].props.tabs[0].content[0].list.postgres = 'POSTGRES';
        }
        return res;
    }
}

module.exports = ConnectorPostgres;
