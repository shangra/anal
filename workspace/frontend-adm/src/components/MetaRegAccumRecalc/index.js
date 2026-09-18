import { Component } from 'react';
import $modal from 'components/ui/MyModal/modal.helper';
import $api from 'helpers/axios';
import { Button, IconButton } from 'ui-kit';
import { getNewIcon } from 'helpers/icon-adapter.helper';
import { buildUrl } from 'helpers/buildUrl';

export class MetaRegAccumRecalc extends Component {
    recalcMetadata = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        const data = {
            id: this.props.id,
            mark_remains: 3,
        };
        // http://localhost:3181/metadata/accounting/recalculate
        $api.post(url, data).then(() => {
            // StateManager.setState({ MetadataTreeReload: true });
            $modal.hide();
        });
    };

    recalcQueue = () => {
        const { server, service, id } = this.props;
        const url = buildUrl(server, service, 'broker', id);
        const data = {
            id: this.props.id,
            // "mark_remains": 3
        };
        // http://localhost:3181/metadata/accounting/recalculate/broker/${this.props.id}
        $api.post(url, data).then(() => {
            $modal.hide();
        });
    };

    onClick = () => {
        $modal.show(
            'Пересчитать?',
            <div>
                <div className="d-flex justify-content-between">
                    <Button onClick={this.recalcMetadata}>Пересчитать всё</Button>
                    <Button onClick={this.recalcQueue}>Пересчитать очередь</Button>
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
