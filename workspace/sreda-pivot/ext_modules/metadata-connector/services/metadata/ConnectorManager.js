class ConnectorManager {
    static _manager;

    connectorsPool = {};

    constructor() {
        if (!ConnectorManager._manager) {
            ConnectorManager._manager = this;

            Object.freeze(this);
        }

        return ConnectorManager._manager;
    }

    /**
     * @param {string} id
     * @returns {*}
     */
    get(id) {
        return this.connectorsPool[id];
    }

    /**
     * @param {string} id
     * @param {*} connector
     */
    set(id, connector) {
        this.connectorsPool[id] = connector;
    }
}

module.exports = new ConnectorManager();
