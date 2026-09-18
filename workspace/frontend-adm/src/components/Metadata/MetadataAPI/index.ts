import $api from 'helpers/axios';
import {
    IMetadataForTable,
    IMetadataObjectResponse,
    MetadataRowType,
    MetadataSearchOptionsType,
    UUIDType,
} from 'components/Metadata/MetadataAPI/types';
import { TabularPartLoader } from 'components/Metadata/TabularPartLoader';
import { buildUrl } from 'helpers/buildUrl';

export type RefType = { value: UUIDType } | UUIDType;

type RecordWithTabularPartType<TabularPartRowAdditionalFields> = {
    record: MetadataRowType;
    tabularParts: {
        create: MetadataRowType<TabularPartRowAdditionalFields>[];
        update: MetadataRowType<TabularPartRowAdditionalFields>[];
        delete: MetadataRowType<TabularPartRowAdditionalFields>[];
    };
};

export class MetadataAPI {
    private server: string;

    constructor(server: string) {
        // server — обязательный параметр; '' означает «основной сервер» (default backend).
        // Если не передан — подставляем '' для обратной совместимости, но вызывающий код
        // всегда должен явно передавать server (см. SRDMDLTKLN-525).
        this.server = server ?? '';
    }

    private convertRefToId = (metadataRef: RefType) => (typeof metadataRef === 'object' ? metadataRef.value : metadataRef);

    public async getFormComponent(id: UUIDType, options: MetadataSearchOptionsType) {
        const query = `?options=${encodeURIComponent(JSON.stringify(options))}`;
        const url = buildUrl(this.server, `metadata/formsmetadata/${id}${query}`);

        return $api.get(url).then((res) => res.data);
    }

    public async getAllMetadataInfoAboutEntity(metadataRef: RefType) {
        const url = buildUrl(this.server, `/metadata/object/${this.convertRefToId(metadataRef)}`);

        return $api.get<{}, { data: IMetadataObjectResponse }>(url).then((res) => res.data);
    }

    public async getDataInRowsAndCols(
        metadataRef: RefType,
        route: string | undefined,
        options: MetadataSearchOptionsType,
        searchInfo?: Record<string, string> | string,
        primaryKey?: string,
    ): Promise<IMetadataForTable> {
        if (searchInfo && primaryKey) {
            options.where = {
                [primaryKey]: searchInfo,
                ...options.where,
            };
        }

        const queryParams = `options=${encodeURIComponent(JSON.stringify(options))}`;
        const url = buildUrl(this.server, `${route}/${this.convertRefToId(metadataRef)}?${queryParams}`);

        const res = await $api.get<{}, { data: IMetadataForTable }>(url);

        return res.data;
    }

    public async getTabularPartInfo(
        route: string,
        recordId: UUIDType,
        tableId: UUIDType,
        tabularPartId: UUIDType,
        options: Record<string, any> = {},
    ): Promise<IMetadataForTable> {
        const computedOptions = {
            ...options,
            where: {
                ...options?.where,
                owner: recordId,
            },
        };

        const query = `options=${JSON.stringify(computedOptions)}`;
        const url = buildUrl(this.server, `${route}/${tableId}/${tabularPartId}?${query}`);
        const res = await $api.get<{}, { data: IMetadataForTable }>(url);

        return res.data;
    }

    // eslint-disable-next-line consistent-return
    public async getTabularPartsByMetadataIdOnly(
        metadataRef: RefType,
        formId: UUIDType,
    ): Promise<IMetadataForTable | undefined> {
        try {
            const { routes: route } = await this.getAllMetadataInfoAboutEntity(metadataRef);

            const { metadata }: any = await this.getDataInRowsAndCols(metadataRef, route, { limit: 1, offset: 0 });

            const tabularPartsMetadata = metadata?.children.find(
                (children: { class: string }) => children.class === 'TabularParts',
            );

            const tabularPart = (
                tabularPartsMetadata?.children as { id: UUIDType; owner_id: UUIDType; routes: string }[]
            )?.[0];

            return await new TabularPartLoader({
                server: this.server,
                route,
                recordId: formId,
                tableId: tabularPart.owner_id,
                tabularPartId: tabularPart.id,
            }).getData();
        } catch (e) {
            console.error(e);
        }
    }

    public async createRecordWithTabularPart<TabularPartRowAdditionalFields>(
        route: string,
        metadataId: UUIDType,
        body: RecordWithTabularPartType<TabularPartRowAdditionalFields>,
    ): Promise<boolean> {
        const url = buildUrl(this.server, `${route}/${metadataId}`);
        const res = await $api.post<{}, { data: boolean }>(url, body);

        return res.data;
    }

    public async updateRecordWithTabularPart<TabularPartRowAdditionalFields>(
        route: string,
        metadataId: UUIDType,
        body: RecordWithTabularPartType<TabularPartRowAdditionalFields>,
    ): Promise<boolean> {
        const url = buildUrl(this.server, `${route}/${metadataId}`);
        const res = await $api.put<{}, { data: boolean }>(url, body);

        return res.data;
    }

    public async getRecordWithTabularPart(recordId: UUIDType): Promise<any> {
        const options = {
            where: {
                id: recordId,
            },
        };

        const query = `options=${JSON.stringify(options)}`;
        // TODO - разобраться с хардкодом
        const url = buildUrl(this.server, `guide/${'240a0f49-623b-4842-b77a-63d11cd0294c'}?${query}`);

        const res = await $api.get<{}, { data: boolean }>(url);

        return res.data;
    }

    public async getMetadataTree(
        options: { hideSubTree?: boolean; isShortTreeVersion?: boolean; subtreeRootItemId?: string } = {},
    ) {
        const { hideSubTree, isShortTreeVersion, subtreeRootItemId } = options;

        const isRootSubTreeRequested = !subtreeRootItemId;
        const url = buildUrl(
            this.server,
            `/metadata/${isShortTreeVersion ? 'v2/' : ''}tree${
                !isRootSubTreeRequested ? `/${subtreeRootItemId}` : ''
            }?hideSubTree=${hideSubTree === true}`,
        );
        const res = await $api.get<{}, { data: boolean }>(url);

        return res.data;
    }
}
