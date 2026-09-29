declare module 'lite-react-statemanager' {
    class States {
        private StatesValues: { [key: string]: any };

        private StatesSubscribe: { [key: string]: { [key: string]: Function } };

        constructor();

        get state(): { [key: string]: any };

        setState(stateObject: { [key: string]: any }, bindThis?: any): void;

        subscribeState(subscribeObject: { [key: string]: { [key: string]: Function } }): void;

        unsubscribeState(subscribeObject: { [key: string]: string[] }): void;

        private _callbackRun(callback: Function, stateName: string, value: any): void;
    }

    const StateManager: States;
    export default StateManager;
}
