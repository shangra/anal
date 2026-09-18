import React, { Component } from 'react';
import $modal from 'components/ui/MyModal/modal.helper';
import $api from 'helpers/axios';
import StateManager from 'lite-react-statemanager';
import { Button, IconButton, TableDatasetAddIcon } from 'ui-kit';
import $message from 'components/ui/MyFlash/message.helper';
import { buildUrl } from 'helpers/buildUrl';

export class DBModelLoader extends Component {
    constructor(props) {
        super(props);

        this.server = (props.server || '').replace(/\/+$/gm, '');

        this.displayData = this.displayData.bind(this);
        this.handleFileSelect = this.handleFileSelect.bind(this);
        this.inputRef = React.createRef();
        this.textareaRef = React.createRef();
    }

    displayData = (content) => {
        $modal.show(
            'Загрузка модели таблицы',
            <div>
                <textarea ref={this.textareaRef} rows={20} defaultValue={content} />
                <div className="d-flex justify-content-center">
                    <Button onClick={this.save}>Загрузить</Button>
                </div>
            </div>,
        );
        // this.setState({ showData: true, data: content }); //НЕ РАБОТАЕТ :(
    };

    loadFromText = () => {
        this.displayData('');
    };

    handleFileSelect(evt) {
        const { files } = evt.target;
        if (!files.length) {
            $message.show('No file select');
            return;
        }
        const file = files[0];
        const that = this;
        const reader = new FileReader();
        reader.onload = (e) => {
            that.displayData(e.target.result);
        };
        reader.readAsText(file);
    }

    loadFromFile = () => {
        this.inputRef.current.click();
    };

    saveFromDB = () => {
        const url = buildUrl(this.server, `${this.props.service}/fromDB`);
        $api.post(url, '', {
            headers: {
                'content-type': 'text/plain',
            },
        }).then(() => {
            StateManager.setState({ MetadataTreeReload: true });
            // $modal.hide();
        });
    };

    save = () => {
        const url = buildUrl(this.server, this.props.service);
        const text = this.textareaRef.current.value;
        $api.post(url, text, {
            headers: {
                'content-type': 'text/plain',
            },
        }).then(() => {
            StateManager.setState({ MetadataTreeReload: true });
            $modal.hide();
        });
    };

    onClick = () => {
        $modal.show(
            'Загрузка модели таблицы',
            <div>
                <div className="d-flex justify-content-between">
                    <Button onClick={this.loadFromText}>Из текста</Button>
                    <Button onClick={this.loadFromFile}>Из файла</Button>
                    <Button onClick={this.saveFromDB}>Из DB</Button>
                    <input ref={this.inputRef} type="file" style={{ display: 'none' }} onChange={this.handleFileSelect} />
                </div>
            </div>,
        );
    };

    render() {
        return (
            <div>
                <IconButton
                    icon={TableDatasetAddIcon}
                    title={this.props.title}
                    onClick={this.onClick}
                    variant="outlined"
                    rounded
                />
            </div>
        );
    }
}
