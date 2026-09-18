class QueueAgent {
    constructor(connector = null, options = {}) {
        this.SQLs = [];

        const { queue } = options; //Возможность объединять очереди

        this.setConnector(connector);
        this.options = options;
        this.maxlen = 100;
    }

    setConnector(connector) {
        this.connector = connector;
    }

    add(SQL) {
        this.SQLs.push(SQL);
    }
    get() {
        return this.SQLs.join('; \n');
    }
    clear() {
        this.SQLs.length = 0;
    }

    commit() {
        let result;
        const SQL = this.get();
        if (this.connector) {
            result = this.connector.query(SQL, this.options);
        }
        this.clear();
        return result;
    }
}

module.exports = QueueAgent;
