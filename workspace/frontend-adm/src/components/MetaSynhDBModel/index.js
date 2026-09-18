import { Component } from 'react';
import $modal from 'components/ui/MyModal/modal.helper';
import $api from 'helpers/axios';
import { FormSync } from './form';
import { getNewIcon } from 'helpers/icon-adapter.helper';
import { IconButton } from 'ui-kit';
import { buildUrl } from 'helpers/buildUrl';

export class MetaSynhDBModel extends Component {
    onClick = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        $api.get(url).then((res) => {
            $modal.show(
                'Синхронизировать таблицы',
                <FormSync server={this.props.server} service={this.props.service} data={res.data} />,
                { size: 'xl' },
            );
        });
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
