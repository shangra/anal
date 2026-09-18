import React from 'react';
import $api from 'helpers/axios';
import MyIcon from 'components/ui/MyIcon/MyIcon';
import $modal from 'components/ui/MyModal/modal.helper';
import { Button } from 'ui-kit';
import { buildUrl } from 'helpers/buildUrl';

export class MetaCached extends React.Component {
    clearCache = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        $api.delete(url).then(() => {
            $modal.hide();
        });
    };

    onClick = () => {
        $modal.show(
            'Очистить кеш?',
            <div>
                <div className="d-flex justify-content-between">
                    <Button onClick={this.clearCache}>Очистить кеш объекта</Button>
                </div>
            </div>,
        );
    };

    render() {
        const iconClassName = 'ms-1';
        return (
            <MyIcon
                title={this.props.title}
                icon={this.props.icon}
                size={this.props.size ?? 25}
                className={iconClassName}
                onClick={this.onClick}
                containerStyle={this.props.containerStyle}
                style={this.props.style}
            />
        );
    }
}
