import { Component } from 'react';
import $modal from 'components/ui/MyModal/modal.helper';
import $api from 'helpers/axios';
import StateManager from 'lite-react-statemanager';
import { Button, IconButton } from 'ui-kit';
import { getNewIcon } from 'helpers/icon-adapter.helper';
import { buildUrl } from 'helpers/buildUrl';

export class MetaRegAccumReset extends Component {
    recalcMetadata = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        //
        // {
        // 	"id": "6f1ee6b4-0396-4f41-bb2e-ae9ac67249c0"
        // }
        const data = {
            id: this.props.id,
        };
        // http://localhost:3181/metadata/registry/accounting/fill
        $api.post(url, data).then(() => {
            StateManager.setState({ MetadataTreeReload: true });
            $modal.hide();
        });
    };

    onClick = () => {
        $modal.show(
            'Перезаполнить?',
            <div>
                <div className="d-flex justify-content-between">
                    <Button onClick={this.recalcMetadata}>Перезаполнить</Button>
                </div>
            </div>,
        );
    };

    render() {
        return (
            <div>
                <IconButton
                    title={this.props.title}
                    icon={getNewIcon(this.props.icon)}
                    onClick={this.onClick}
                    variant="outlined"
                    rounded
                />
            </div>
        );
    }
}
