import { Component, ReactNode } from 'react';
import { EyeIcon, IconButton } from 'ui-kit';
import $windows from 'components/WindowsCMP/windows.helper';
import $api from 'helpers/axios';
import { MetadataAPI } from 'components/Metadata/MetadataAPI';
import StateManager from 'lite-react-statemanager';
import { MetadataTable } from 'components/MetadataTable';
import { ChangeNodePayload } from './types';
import { buildUrl } from 'helpers/buildUrl';

interface MetaEyeProps {
    id: string;
    route?: string;
    title?: string;
    server?: string;
}

export class MetaEye extends Component<MetaEyeProps, {}> {
    private server: string;

    private metadataAPI: MetadataAPI;

    private changeSubName = `mh-change:${this.props.server}:${Math.random().toString(36).slice(2)}`;

    constructor(props: MetaEyeProps) {
        super(props);
        this.server = (props.server || '').replace(/\/+$/gm, '');
        this.metadataAPI = new MetadataAPI(this.server);
    }

    copyMetadata = async (): Promise<void> => {
        const { id, route, server } = this.props;

        let finalRoute = route;
        if (!finalRoute) {
            const metadataInfo = await this.metadataAPI.getAllMetadataInfoAboutEntity(id);
            finalRoute = metadataInfo.routes;
        }

        const options = { limit: 200, offset: 0, withOutCount: true };
        const queryParams = `options=${encodeURIComponent(JSON.stringify(options))}`;

        const url = buildUrl(server, `metadata/${finalRoute}/${id}?${queryParams}`);
        const ddlUrl = buildUrl(server, `metaddldump/${id}`);
        const [res, ddlRes] = await Promise.allSettled([
            $api.get(url),
            $api.post(ddlUrl, {}),
        ]);
        if (res.status !== 'fulfilled') {
            throw res.reason;
        }
        const data = { ...res.value.data };
        if (ddlRes.status === 'fulfilled') {
            data.ddl = ddlRes.value.data?.sql || ddlRes.value.data?.script || ddlRes.value.data;
            if (typeof data.ddl === 'object') {
                data.ddl = data.ddl.sql || data.ddl.script || JSON.stringify(data.ddl, null, 2);
            }
        }
        const cmp = (
            <MetadataTable id={id} route={finalRoute} data={data} server={this.server} metadataAPI={this.metadataAPI} />
        );
        $windows.open(res.value.data.metadata?.name ?? 'Просмотр', cmp, {
            width: '1000px',
            uuid: `eye::${id}`,
        });
    };

    componentDidMount(): void {
        StateManager.subscribeState({
            changeNode: { [this.changeSubName]: this.onChangeNode },
        });
    }

    componentWillUnmount(): void {
        StateManager.unsubscribeState({
            changeNode: [this.changeSubName],
        });
    }

    private onChangeNode = async (data: ChangeNodePayload): Promise<void> => {
        const { changeNode } = data;
        if (!changeNode.manifest?.name) return;
        $windows.rename(`eye::${changeNode.nodeId}`, changeNode.manifest?.name);
    };

    render(): ReactNode {
        return (
            <div>
                <IconButton title={this.props.title} icon={EyeIcon} onClick={this.copyMetadata} variant="outlined" rounded />
            </div>
        );
    }
}
