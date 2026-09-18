import { PluginPivot } from '../PluginPivot';
import {
    IFetchOptions,
    PluginPivotChunkTypes,
    PluginPivotDataSettingsParams,
    PluginPivotDataSettingsParamsHeader,
    PluginPivotResponseData,
    Totals,
} from '../types';
import { getHashChunk, getHashHeader, isColumnChunk, isIndexChunk } from '../utils';

export type PluginPivotChunksChunkParentHeader = {
    /** Иерархия/следующее измерение */
    type: PluginPivotChunkTypes;
    /** Ключ колонки */
    key: string;
    /** Имя измерения */
    dbColumn: string;
    /** Значение измерения */
    value: string | number;
    /** Ключ чанка-родителя */
    chunkKey: string | 'root';
};

export type PluginPivotChunksChunkParentHeadersForHash = {
    index?: Pick<PluginPivotChunksChunkParentHeader, 'chunkKey' | 'key' | 'type'>;
    columns?: Pick<PluginPivotChunksChunkParentHeader, 'chunkKey' | 'key' | 'type'>;
};

export type PluginPivotChunksChunkParentHeaders = {
    index?: PluginPivotChunksChunkParentHeader;
    columns?: PluginPivotChunksChunkParentHeader;
};

export type PluginPivotChunksChunk = {
    key: string;
    parentHeader?: PluginPivotChunksChunkParentHeaders;
    index: string[];
    columns: string[];
    dependent: string[];
    totals: Totals;
    refs?: Record<string, Record<string, string>>;
    params: PluginPivotDataSettingsParams;
    options: IFetchOptions;
    isLoading: boolean;
};

export type PluginPivotChunksChunksState = Record<string, PluginPivotChunksChunk>;

export type PluginPivotChunksState = {
    chunks: PluginPivotChunksChunksState;
    hasLoadingIndexChunk: boolean;
    hasLoadingColumnChunk: boolean;
};

export type PluginPivotChunksPendingChunk = {
    data: Required<PluginPivotResponseData>;
    params: PluginPivotDataSettingsParams;
    options: IFetchOptions;
};

export type PluginPivotChunksPendingChunksState = Record<string, PluginPivotChunksPendingChunk>;

export class PluginPivotChunks {
    pluginPivot: PluginPivot;

    state: PluginPivotChunksState;

    /**
     * Промежуточное хранилище чанков, загруженных но еще не примененных в основное состояние.
     * Используется для пакетной загрузки чанков с последующим единым применением.
     */
    pendingChunks: PluginPivotChunksPendingChunksState;

    constructor(pluginPivot: PluginPivot) {
        this.pluginPivot = pluginPivot;
        this.state = {
            chunks: {},
            hasLoadingIndexChunk: false,
            hasLoadingColumnChunk: false,
        };
        this.pendingChunks = {};
    }

    removeState() {
        this.state = {
            chunks: {},
            hasLoadingIndexChunk: false,
            hasLoadingColumnChunk: false,
        };
    }

    getChunkParams = (
        type: 'hierarchy' | 'open',
        header: 'columns' | 'index',
        meta: {
            dbColumn: string;
            chunkKey: string;
            index: number;
            level: number;
            dimension: string | number;
            value?: PluginPivotDataSettingsParamsHeader;
            layer?: PluginPivotDataSettingsParamsHeader;
        },
    ): PluginPivotDataSettingsParams => {
        const { chunks } = this.pluginPivot.pluginPivotChunks.state;

        const nesting = chunks.root?.params?.[header === 'index' ? 'rows' : header]?.slice(meta.index + 1) ?? [];

        const chunkParams = chunks[meta.chunkKey]?.params;

        const totals = chunks.root?.totals ?? {};

        return {
            ...chunkParams,
            ...(type === 'open' &&
                meta.index !== -1 &&
                !!nesting.length && {
                    [header === 'index' ? 'rows' : header]: [...nesting],
                }),
            ...(header === 'columns' && {
                values: [meta.value],
                layers: [meta.layer],
            }),
            where: {
                ...chunkParams?.where,
                [meta.dbColumn]: {
                    __parent__: meta.dimension,
                    __level__: meta.level,
                },
            },
            totals: {
                ...(header === 'columns'
                    ? {
                          indexes: Boolean(totals.indexes),
                      }
                    : {
                          columns: Boolean(totals.columns),
                      }),
            },
        } as unknown as PluginPivotDataSettingsParams;
    };

    initializationChunk(parentHeader?: PluginPivotChunksChunkParentHeaders, dependencies?: string[]) {
        const chunkKey = !parentHeader ? 'root' : getHashChunk(parentHeader);

        this.state.chunks[chunkKey] = {
            key: chunkKey,
            parentHeader,
            isLoading: false,
            index: [],
            columns: [],
            dependent: [],
            params: {},
            options: {},
            totals: {
                columns: {},
                indexes: {},
                totals: {},
            },
        };

        if (dependencies) {
            dependencies.forEach((dep) => {
                this.state.chunks?.[dep]?.dependent?.push(chunkKey);
            });
        }
        if (parentHeader?.columns && this.state.chunks[parentHeader.columns.chunkKey]) {
            this.state.chunks[parentHeader.columns.chunkKey].dependent.push(chunkKey);
        }

        if (parentHeader?.index && this.state.chunks[parentHeader.index.chunkKey]) {
            this.state.chunks[parentHeader.index.chunkKey].dependent.push(chunkKey);
        }

        return chunkKey;
    }

    updateChunkData(uuid: string, chunk: PluginPivotChunksChunk) {
        if (this.state.chunks[uuid]) {
            this.state.chunks[uuid] = chunk;
        }
    }

    setLoading(chunkKey: string | 'root' = 'root') {
        if (this.state.chunks?.[chunkKey]) {
            this.state.chunks[chunkKey].isLoading = true;
        }
    }

    setLoaded(chunkKey: string | 'root' = 'root') {
        if (this.state.chunks?.[chunkKey]) {
            this.state.chunks[chunkKey].isLoading = false;
        }
    }

    registerChunk(
        chunkKey: string,
        data: Required<PluginPivotResponseData>,
        params: PluginPivotDataSettingsParams,
        options: IFetchOptions,
    ) {
        data = structuredClone(data);
        params = structuredClone(params);
        options = structuredClone(options);
        // @ts-ignore
        this.state.chunks[chunkKey].params = params;
        this.state.chunks[chunkKey].options = options;
        this.state.chunks[chunkKey].refs = data.refs;
        if (data.data?.totals) {
            for (const totalKey in params.totals) {
                // @ts-ignore
                this.state.chunks[chunkKey].totals[totalKey] = data.data.totals[totalKey];
            }
        }

        const { parentHeader } = this.state.chunks[chunkKey];

        if (!parentHeader || (!!parentHeader?.columns && !parentHeader?.index)) {
            const nameColumn = data.data.settings.params.columns![0].name;

            this.state.chunks[chunkKey].columns = [];
            Object.keys(data.data.columns).forEach((columnIndex) => {
                const computedName = data.data.columns[parseInt(columnIndex, 10)].join('::');
                this.state.chunks[chunkKey].columns.push(getHashHeader(nameColumn, computedName, parentHeader?.columns?.key));
            });
        }

        if (!parentHeader || (!!parentHeader?.index && !parentHeader?.columns)) {
            const nameIndex = data.data.settings.params.rows![0].name;

            this.state.chunks[chunkKey].index = [];
            Object.keys(data.data.index).forEach((index) => {
                const value = data.data.index[parseInt(index, 10)];
                this.state.chunks[chunkKey].index.push(getHashHeader(nameIndex, value, parentHeader?.index?.key));
            });
        }
    }

    /**
     * Регистрирует чанк в промежуточное хранилище вместо основного состояния.
     * Чанк будет применен позже через applyPendingChunks().
     */
    registerPendingChunk(
        chunkKey: string,
        data: Required<PluginPivotResponseData>,
        params: PluginPivotDataSettingsParams,
        options: IFetchOptions,
    ) {
        data = structuredClone(data);
        params = structuredClone(params);
        options = structuredClone(options);

        // Already pending — overwrite with fresh data
        this.pendingChunks[chunkKey] = { data, params, options };
    }

    /**
     * Применяет все чанки из промежуточного хранилища в основное состояние.
     * Вызывает registerChunk + buildChunk для каждого чанка в порядке их зависимости.
     * После применения промежуточное хранилище очищается.
     */
    applyPendingChunks() {
        const pendingKeys = Object.keys(this.pendingChunks);

        if (!pendingKeys.length) return;

        // Sort in dependency order: chunks without parentHeader first, then by parent relationship
        const sorted = this.sortPendingByDependency(pendingKeys);

        for (const chunkKey of sorted) {
            const pending = this.pendingChunks[chunkKey];
            if (!pending) continue;

            this.registerChunk(chunkKey, pending.data, pending.params, pending.options);
            this.pluginPivot.pluginPivotData.buildChunk(chunkKey, pending.data);
        }

        this.pendingChunks = {};
    }

    /**
     * Сортирует чанки по зависимости: чанки без parentHeader первыми,
     * затем чанки по parentHeader.columns и parentHeader.index.
     */
    sortPendingByDependency(keys: string[]): string[] {
        const rootFirst = keys.filter((k) => k === 'root');
        const rest = keys.filter((k) => k !== 'root');

        // For remaining chunks, sort by parent order to ensure parents are processed first
        // We do a simple topological pass using the existing chunk state
        const ordered: string[] = [];
        const remaining = new Set(rest);

        // First add parent chunks from existing state, then add remaining
        for (const key of rest) {
            const chunk = this.state.chunks[key];
            if (chunk?.parentHeader?.columns?.chunkKey && remaining.has(chunk.parentHeader.columns.chunkKey)) {
                // Parent exists and is pending — it will be added first
                continue;
            }
            if (chunk?.parentHeader?.index?.chunkKey && remaining.has(chunk.parentHeader.index.chunkKey)) {
                // Parent exists and is pending — it will be added first
                continue;
            }
            ordered.push(key);
            remaining.delete(key);
        }

        // Add remaining (orphaned or fully resolved)
        for (const key of rest) {
            if (!ordered.includes(key)) {
                ordered.push(key);
            }
        }

        return [...rootFirst, ...ordered];
    }

    /**
     * Очищает промежуточное хранилище чанков.
     * Вызывается при ошибке загрузки.
     */
    clearPendingChunks() {
        this.pendingChunks = {};
    }

    removeChunk(chunkKey: string) {
        const response: { index: string[]; columns: string[] } = {
            index: [],
            columns: [],
        };

        const chunk = this.state.chunks[chunkKey];
        if (!chunk) return response;

        response.columns.push(...chunk.columns);
        response.index.push(...chunk.index);

        if (chunk.dependent.length) {
            chunk.dependent
                .map((chunkKey) => this.removeChunk(chunkKey))
                .forEach((res) => {
                    response.columns.push(...res.columns);
                    response.index.push(...res.index);
                });
        }

        delete this.state.chunks[chunkKey];

        return response;
    }

    /**
     * Вычисляет уровень раскрытия чанка
     */
    getNestingLevel(chunkKey: string, headerType: 'index' | 'columns', type: 'hierarchy' | 'open' = 'hierarchy') {
        const recursive = (chunkKey: string, headerType: 'index' | 'columns', level: number): number => {
            const parentChunkKey = this.state.chunks[chunkKey]?.parentHeader?.[headerType]?.chunkKey;
            const parentType = this.state.chunks[chunkKey]?.parentHeader?.[headerType]?.type;

            return parentChunkKey && parentType === type ? recursive(parentChunkKey, headerType, level + 1) : level;
        };

        return recursive(chunkKey, headerType, 0);
    }

    getHasChunk = (chunkHash: string): boolean => !!this.state.chunks?.[chunkHash];

    /**
     * Проверяет, был ли чанк загружен (даже если он пустой или схлопнут).
     */
    wasChunkLoaded = (chunkHash: string): boolean => {
        const chunk = this.state.chunks?.[chunkHash];
        return !!chunk && !chunk.isLoading;
    };

    /**
     * Проверяет, что чанк загружен и НЕ схлопнут (т.е. данные актуальны и отображаются).
     */
    isChunkExpanded = (chunkHash: string): boolean => {
        const chunk = this.state.chunks?.[chunkHash];
        return !!chunk && !chunk.isLoading;
    };

    /**
     * Проверяет, что чанк существует и пустой (не содержит ни колонок, ни индексов).
     * Используется для определения схлопнутых после пустой загрузки чанков.
     */
    isChunkEmpty = (chunkHash: string): boolean => {
        const chunk = this.state.chunks?.[chunkHash];
        return !!chunk && !chunk.columns.length && !chunk.index.length;
    };

    hasLoadingChunk() {
        return Object.values(this.state.chunks).some(({ isLoading }) => isLoading);
    }

    isChunkLoading = (chunkHash: string): boolean => !!this.state.chunks[chunkHash]?.isLoading;

    hasLoadingColumnChunk() {
        return Object.values(this.state.chunks).some(
            ({ isLoading, parentHeader }) => isLoading && parentHeader && isColumnChunk(parentHeader),
        );
    }

    hasLoadingIndexChunk() {
        return Object.values(this.state.chunks).some(
            ({ isLoading, parentHeader }) => isLoading && parentHeader && isIndexChunk(parentHeader),
        );
    }
}
