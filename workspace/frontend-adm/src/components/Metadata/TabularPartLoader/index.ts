import { UUIDType } from 'components/Metadata/MetadataAPI/types';
import { MetadataAPI, RefType } from 'components/Metadata/MetadataAPI';

interface TabularPartLoaderOptionsType {
    server: string;
    recordId: UUIDType;
    metadataId?: RefType;
    route?: string;
    tableId?: UUIDType;
    tabularPartId?: UUIDType;
}

export class TabularPartLoader {
    protected metadataAPI: MetadataAPI;

    protected options: TabularPartLoaderOptionsType;

    constructor(options: TabularPartLoaderOptionsType) {
        this.options = options;
        this.metadataAPI = new MetadataAPI(options.server);
    }

    getData() {
        return this.options.metadataId
            ? this.metadataAPI.getTabularPartsByMetadataIdOnly(this.options.metadataId, this.options.recordId)
            : this.metadataAPI.getTabularPartInfo(
                  String(this.options?.route),
                  this.options.recordId,
                  String(this.options?.tableId),
                  String(this.options?.tabularPartId),
              );
    }
}
