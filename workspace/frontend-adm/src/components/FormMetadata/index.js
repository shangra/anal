import React, { Component } from 'react';
import { SberDynamicComponent } from 'components/sberComponents';
import { MetadataAPI } from 'components/Metadata/MetadataAPI';
import { MetadataServerContext } from 'components/MetadataForms/DataManager/serverContext';

export class FormMetadata extends Component {
    constructor(props) {
        super(props);

        this.state = {
            form: <div>Loading...</div>,
        };

        // server — обязательный параметр MetadataAPI; '' — fallback (default backend).
        // Открытые ранее формы не перерендериваются при смене сервера в дереве — см. SRDMDLTKLN-525.
        this.metadataAPI = new MetadataAPI(props.server ?? '');
    }

    loadFormComponent = (id, options, callback = undefined) => {
        this.metadataAPI
            .getFormComponent(id, options)
            .then((res) => {
                this.setState({ form: <SberDynamicComponent json={res} key={Date.now()} /> });
            })
            .finally(() => {
                if (callback) callback();
            });
    };

    renderForms() {
        if (this.props.type === 'list') {
            this.loadFormComponent(this.props.id, { type: this.props.type });
        } else if (this.props.type === 'element') {
            this.loadFormComponent(this.props.id, {
                type: this.props.type,
                element: this.props.element,
                primaryKey: this.props.primaryKey,
                method: this.props.method,
                payload: this.props.payload,
                // ...(this.props.method && {
                //     method: this.props.method
                // })
            });
        } else if (this.props.type === 'choice') {
            this.loadFormComponent(this.props.id, { type: this.props.type, payload: this.props.payload });
        } else if (this.props.type === 'group') {
            this.loadFormComponent(this.props.id, {
                type: this.props.type,
                element: this.props.element,
                primaryKey: this.props.primaryKey,
                payload: this.props.payload,
            });
        }
    }

    componentDidMount() {
        this.renderForms();
    }

    componentWillUnmount() {
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    render() {
        return (
            <MetadataServerContext.Provider value={this.props.server ?? ''}>{this.state.form}</MetadataServerContext.Provider>
        );
    }
}
