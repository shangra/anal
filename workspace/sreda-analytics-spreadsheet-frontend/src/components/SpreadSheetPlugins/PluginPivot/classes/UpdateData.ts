import { v4 as uuid } from 'uuid';

import { PluginPivot } from '../PluginPivot';
import { IFetchOptions, PluginPivotResponseData } from '../types';
import { getHashHeader } from '../utils';
import { PluginPivotChunksChunk } from './PluginPivotChunks';

export class UpdateData {
    pluginPivot: PluginPivot;

    constructor(pluginPivot: PluginPivot) {
        this.pluginPivot = pluginPivot;
    }

    /**
     * Метод обновление чанков первой вложенности от рута
     */
    updateChunks = async (chunks: PluginPivotChunksChunk[], loadChunks: string[], options: IFetchOptions) => {
        const next = [];

        for (const chunk of chunks) {
            // проверяем что чанк еще актуален
            // чанк может быть по индексу, колонке или перекрестный
            // так же проверяем что родительские чанки уже загружены
            if (
                (chunk.parentHeader?.columns?.chunkKey && !loadChunks.includes(chunk.parentHeader.columns.chunkKey)) ||
                (chunk.parentHeader?.index?.chunkKey && !loadChunks.includes(chunk.parentHeader.index.chunkKey))
            ) {
                // если родительский чанк еще не загружен то пропускаем, он загрузиться позже при следующих обработках
                // убираем из текущего прохода этот чанк
                chunks.splice(
                    chunks.findIndex((ch) => ch.key === chunk.key),
                    1,
                );

                continue;
            }

            if (chunk.parentHeader?.columns) {
                // const parentColumn = Object.values(this.pluginPivot.pluginPivotData.state.columns.data).find(
                //     (column) =>
                //         column.meta.dbColumn === chunk.parentHeader!.columns!.dbColumn &&
                //         column.meta.dimension === chunk.parentHeader!.columns!.value,
                // );
                // Проверяем актуальность родителя в основном состоянии или в промежуточном хранилище
                const parentExistsInState =
                    !!this.pluginPivot.pluginPivotData.state.columns.data[chunk.parentHeader!.columns!.key];
                const parentKey = chunk.parentHeader!.columns!.key;
                const pendingRoot = this.pluginPivot.pluginPivotChunks.pendingChunks.root;
                const parentExistsInPending = pendingRoot?.data?.data?.columns?.some(
                    (col: (string | number)[]) =>
                        getHashHeader(pendingRoot.data.data.settings.params.columns![0].name, col.join('::'), undefined) ===
                        parentKey,
                );
                if (!parentExistsInState && !parentExistsInPending) {
                    console.error('delete chunk: column');
                    // удаляем чанк если он не актуален
                    this.pluginPivot.pluginPivotChunks.removeChunk(chunk.key);
                    continue;
                }
                //  else {
                //     // если чанк актуален то нужно обновить uuid родительской колонки в parentHeader
                //     this.pluginPivot.pluginPivotChunks.updateChunkData(chunk.key, {
                //         ...chunk,
                //         parentHeader: {
                //             ...chunk.parentHeader,
                //             columns: {
                //                 ...chunk.parentHeader.columns,
                //                 key: parentColumn.meta.key,
                //             },
                //         },
                //     });
                // }
            }

            if (chunk.parentHeader?.index) {
                // const parentIndex = Object.values(this.pluginPivot.pluginPivotData.state.index.data).find(
                //     (index) =>
                //         index.meta.dbColumn === chunk.parentHeader!.index!.dbColumn &&
                //         index.meta.dimension === chunk.parentHeader!.index!.value,
                // );
                // Проверяем актуальность родителя в основном состоянии или в промежуточном хранилище
                const parentExistsInState =
                    !!this.pluginPivot.pluginPivotData.state.index.data[chunk.parentHeader!.index!.key];
                const parentKey = chunk.parentHeader!.index!.key;
                const pendingRoot = this.pluginPivot.pluginPivotChunks.pendingChunks.root;
                const parentExistsInPending = pendingRoot?.data?.data?.index?.some(
                    (idx: string | number, idxIndex: number) =>
                        getHashHeader(
                            pendingRoot.data.data.settings.params.rows![0].name,
                            pendingRoot.data.data.index[idxIndex],
                            undefined,
                        ) === parentKey,
                );
                if (!parentExistsInState && !parentExistsInPending) {
                    console.error('delete chunk: index');
                    // удаляем чанк если он не актуален
                    this.pluginPivot.pluginPivotChunks.removeChunk(chunk.key);
                    continue;
                }
                //  else {
                //     // если чанк актуален то нужно обновить uuid родительской колонки в parentHeader
                //     this.pluginPivot.pluginPivotChunks.updateChunkData(chunk.key, {
                //         ...chunk,
                //         parentHeader: {
                //             ...chunk.parentHeader,
                //             index: {
                //                 ...chunk.parentHeader.index,
                //                 key: parentIndex.meta.key,
                //             },
                //         },
                //     });
                // }
            }

            // TODO: Обратная совместимость
            const params = {
                ...this.pluginPivot.pluginPivotChunks.state.chunks.root.params,
                ...chunk.params,
                where: {
                    ...this.pluginPivot.pluginPivotChunks.state.chunks.root.params?.where,
                    ...chunk.params?.where,
                },
            };

            // запрашиваем данные
            // eslint-disable-next-line no-await-in-loop
            const data = (await this.pluginPivot.getTableData.getTableData(
                this.pluginPivot.infoserviceId,
                params,
                // @ts-ignore
                { explain: options.ignoreCache, sliceTraceId: options.sliceTraceId }, // TODO: Костыль, чтобы перезапросить данные мимо кэша
            )) as unknown as Required<PluginPivotResponseData>;
            // регистрируем данные в промежуточное хранилище (пакетное применение)
            this.pluginPivot.pluginPivotChunks.registerPendingChunk(chunk.key, data, chunk.params, {
                sliceTraceId: options.sliceTraceId,
            });
            loadChunks.push(chunk.key);

            next.push(
                ...Object.values(this.pluginPivot.pluginPivotChunks.state.chunks).filter((c) =>
                    chunk.dependent.includes(c.key),
                ),
            );
        }

        // После загрузки всех дочерних чанков — применяем их единым пакетом
        if (next.length) {
            await this.updateChunks(next, loadChunks, options);
        }

        // Применяем все промежуточные чанки в основное состояние
        this.pluginPivot.pluginPivotChunks.applyPendingChunks();
    };

    /**
     * Метод вызова обновления данных таблицы со всеми вложенностями
     */
    update = async (options: IFetchOptions = { ignoreCache: true, sliceTraceId: uuid() }) => {
        try {
            // закрываем взаимодействие с таблицей на время обновления всех данных
            this.pluginPivot.pluginPivotChunks.setLoading();
            await this.pluginPivot.renderTable();

            // получаем данные рутового запроса
            const { params } = this.pluginPivot.pluginPivotChunks.state.chunks.root;

            // запрашиваем  новые данные
            const data = await this.pluginPivot.getTableData.getTableData(
                this.pluginPivot.infoserviceId,
                params,
                // @ts-ignore
                { explain: options.ignoreCache, sliceTraceId: options.sliceTraceId }, // TODO: Костыль, чтобы перезапросить данные мимо кэша
            );

            // очищаем состояние данныхы
            this.pluginPivot.pluginPivotData.removeState();

            // регистрируем данные рутового чанка в промежуточное хранилище (пакетное применение)
            this.pluginPivot.pluginPivotChunks.registerPendingChunk(
                'root',
                data as unknown as Required<PluginPivotResponseData>,
                params,
                {
                    sliceTraceId: options.sliceTraceId,
                },
            );

            // получаем список чанков
            // так как deps содержит массив вложенных чанков ищем чанки образованные от рута  по parentHeader
            // данные root берем из промежуточного хранилища (состояние еще не обновлено)
            const rootPending = this.pluginPivot.pluginPivotChunks.pendingChunks.root;
            const valuesIndexes: (string | number)[] = rootPending?.data?.data?.index ?? [];
            const valuesColumns: (string | number)[] =
                rootPending?.data?.data?.columns?.map((column: (string | number)[]) => column[2]) ?? [];

            // Список чанков от рута
            const chunks = Object.values(this.pluginPivot.pluginPivotChunks.state.chunks).filter((chunk) => {
                const isRootColumn = chunk.parentHeader?.columns && valuesColumns.includes(chunk.parentHeader.columns?.value);
                const isRootIndex = chunk.parentHeader?.index && valuesIndexes.includes(chunk.parentHeader.index?.value);
                const isEmptyColumn = !chunk.parentHeader?.columns;
                const isEmptyIndex = !chunk.parentHeader?.index;

                return (isRootColumn && isEmptyIndex) || (isRootIndex && isEmptyColumn) || (isRootColumn && isRootIndex);
            });

            // вызываем обновление чанков
            await this.updateChunks(chunks, ['root'], options);
        } catch (error) {
            console.error(error);
            // Очищаем промежуточное хранилище при ошибке, чтобы незагруженные чанки
            // не блокировали будущие запросы
            this.pluginPivot.pluginPivotChunks.clearPendingChunks();
        } finally {
            // открываем взаимодействие с таблицей после обновления всех данных
            this.pluginPivot.pluginPivotChunks.setLoaded();
            await this.pluginPivot.renderTable();
        }
    };
}
