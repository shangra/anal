import { Component } from 'react';
import $modal from 'components/ui/MyModal/modal.helper';
import $api from 'helpers/axios';
import StateManager from 'lite-react-statemanager';
import { Button, CopyIcon, IconButton, PlusOutlineIcon } from 'ui-kit';
import { buildUrl } from 'helpers/buildUrl';

export class MetaCopyPaste extends Component {
    copyMetadata = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        $api.get(url).then((res) => {
            StateManager.setState({ MetadataClipboard: res.data });
            $modal.hide();
        });
    };

    pasteMetadata = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        const data = StateManager.state.MetadataClipboard;
        $api.post(url, data).then(() => {
            StateManager.setState({ MetadataTreeReload: true });
            $modal.hide();
        });
    };

    onCopyClick = () => {
        $modal.show(
            'Копировать?',
            <div>
                <div className="d-flex justify-content-between">
                    <Button onClick={this.copyMetadata}>Копировать</Button>
                </div>
            </div>,
        );
    };

    onPasteClick = () => {
        $modal.show(
            'Вставить?',
            <div>
                <div className="d-flex justify-content-between">
                    <Button onClick={this.pasteMetadata}>Вставить</Button>
                </div>
            </div>,
        );
    };

    render() {
        return this.props.type === 'copy' ? (
            <div>
                <IconButton title={this.props.title} icon={CopyIcon} onClick={this.onCopyClick} variant="outlined" rounded />
            </div>
        ) : (
            <div>
                <IconButton
                    title={this.props.title}
                    icon={PlusOutlineIcon}
                    variant="outlined"
                    onClick={this.onPasteClick}
                    rounded
                />
            </div>
        );
    }
}
