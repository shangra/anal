// Компонент для случаев, когда нужно использовать SpreadsheetAdapter отдельно от AdapterSpreadSheet
// (например, в тестах или при создании альтернативного рендерера)

import React from 'react';

import { Adapter, AdapterAPI, PluginContextInit } from '../Adapter';
import { Plugin } from '../Plugin';
import { SpreadsheetAction } from '../SpreadsheetAction';
import { AdapterCtx, AdapterSubscribableAPI } from './AdapterContext';

interface AdapterProviderProps {
    plugins: Plugin<any, any, any>[];
    contextInit: PluginContextInit;
    children: React.ReactNode;
}

interface AdapterProviderState {}

/**
 * Standalone React-обёртка над SpreadsheetAdapter.
 * Используется когда нет AdapterSpreadSheet (тесты, стенды, альтернативные рендереры).
 */
export class AdapterProvider extends React.Component<AdapterProviderProps, AdapterProviderState> {
    private readonly adapter: Adapter;

    constructor(props: AdapterProviderProps) {
        super(props);
        this.state = {};
        this.adapter = new Adapter(props.plugins);
        this.adapter.injectContext(props.contextInit);
    }

    componentDidMount(): void {
        this.adapter.onMount();
    }

    componentWillUnmount(): void {
        this.adapter.onUnmount();
    }

    private dispatch = (action: SpreadsheetAction): void => {
        this.adapter.dispatch(action);
    };

    render() {
        // eslint-disable-next-line react/jsx-no-constructed-context-values
        const api: AdapterSubscribableAPI = {
            dispatch: this.dispatch,
            getCellStyle: this.adapter.getCellStyle,
            getCellDisplay: this.adapter.getCellDisplay,
            getPlugin: this.adapter.getPlugin,
            getPluginState: this.adapter.getPluginState,
            getVersion: () => 0,
            subscribe: () => () => {},
        };
        return <AdapterCtx.Provider value={api}>{this.props.children}</AdapterCtx.Provider>;
    }
}
