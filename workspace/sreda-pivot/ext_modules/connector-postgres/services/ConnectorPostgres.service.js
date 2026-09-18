const Connector = require('./connector/PostgresConnector');

class ConnectorPostgres {
    async loadConnectorsBefore(res, params) {
        params['ConnectorList']['postgres'] = Connector;
    }

    async formAfter(res, params) {
        //postgres: 'POSTGRES'
        const { form } = res;
        form[0].props.tabs[0].content[0].list['postgres'] = 'POSTGRES';
        return res;
    }
}

module.exports = ConnectorPostgres;
