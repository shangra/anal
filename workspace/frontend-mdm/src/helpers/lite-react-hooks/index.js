class Hooks {
    
    constructor() {
        this.HooksSubscribe = {};
    }
    
    _callbackRun(callback, stateName, value) {
        let object = {};
        object[stateName] = value;
        if (typeof callback === "function") {
            callback(object);
        }
    }
    
    setHook(stateObject) {
        for (let stateName in stateObject) {
            let value = stateObject[stateName];
            
            let listSubscribes = this.HooksSubscribe[stateName];
            for (let key in listSubscribes) {
                let callback = listSubscribes[key];
                
                this._callbackRun(callback, stateName, value);
            }
        }
    }
    
    
    subscribeHook(subscribeObject) {
        for (let stateName in subscribeObject) {
            let subscribes = subscribeObject[stateName];
            
            if (this.HooksSubscribe[stateName] === undefined) {
                this.HooksSubscribe[stateName] = {}
            }
            let allSubscribesName = Object.keys(this.HooksSubscribe[stateName]);
            
            for (let subscribeName in subscribes) {
                if (!allSubscribesName.includes(subscribeName)) {
                    this.HooksSubscribe[stateName] = {...this.HooksSubscribe[stateName], ...subscribes};
                }
            }
        }
    }
    
    unsubscribeHook(subscribeObject) {
        for (let stateName in subscribeObject) {
            let subscribes = subscribeObject[stateName];
            
            if (this.HooksSubscribe[stateName] !== undefined) {
                let allSubscribesName = Object.keys(this.HooksSubscribe[stateName]);
                
                for (let subscribeIndex in subscribes) {
                    let subscribeName = subscribes[subscribeIndex];
                    if (allSubscribesName.includes(subscribeName)) {
                        delete this.HooksSubscribe[stateName][subscribeName];
                    }
                }
            }
        }
    }
    
    
}


let HooksManager = new Hooks();

export default HooksManager;