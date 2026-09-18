class Hooks {
    constructor() {
        this.HooksSubscribe = {};
    }

    _callbackRun(callback, stateName, value) {
        const object = {};
        object[stateName] = value;
        if (typeof callback === 'function') {
            callback(object);
        }
    }

    setHook(stateObject) {
        for (const stateName in stateObject) {
            const value = stateObject[stateName];

            const listSubscribes = this.HooksSubscribe[stateName];
            for (const key in listSubscribes) {
                const callback = listSubscribes[key];

                this._callbackRun(callback, stateName, value);
            }
        }
    }

    subscribeHook(subscribeObject) {
        for (const stateName in subscribeObject) {
            const subscribes = subscribeObject[stateName];

            if (this.HooksSubscribe[stateName] === undefined) {
                this.HooksSubscribe[stateName] = {};
            }
            const allSubscribesName = Object.keys(this.HooksSubscribe[stateName]);

            for (const subscribeName in subscribes) {
                if (!allSubscribesName.includes(subscribeName)) {
                    this.HooksSubscribe[stateName] = { ...this.HooksSubscribe[stateName], ...subscribes };
                }
            }
        }
    }

    unsubscribeHook(subscribeObject) {
        for (const stateName in subscribeObject) {
            const subscribes = subscribeObject[stateName];

            if (this.HooksSubscribe[stateName] !== undefined) {
                const allSubscribesName = Object.keys(this.HooksSubscribe[stateName]);

                for (const subscribeIndex in subscribes) {
                    const subscribeName = subscribes[subscribeIndex];
                    if (allSubscribesName.includes(subscribeName)) {
                        delete this.HooksSubscribe[stateName][subscribeName];
                    }
                }
            }
        }
    }
}

const HooksManager = new Hooks();

export default HooksManager;
