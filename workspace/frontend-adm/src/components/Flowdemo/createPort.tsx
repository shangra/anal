import React from 'react';
import $api from 'helpers/axios';
import { buildUrl } from 'helpers/buildUrl';
import $windows from 'components/WindowsCMP/windows.helper';
import $message from 'components/ui/MyFlash/message.helper';
import StateManager from 'lite-react-statemanager';
import { Inspector } from 'components/Inspector';
import type { HostEvent, NodeFormRef, ProcessHostPort, ProcessSchema } from './contract';

const PROCESS_ROUTE = 'metadata/processes';

/**
 * Реализация границы с канвасом. Всё знание об устройстве backend и об
 * инспекторе живёт здесь — по обе стороны от shell'а его нет.
 *
 * Порт семантический: канвас говорит «дай схему», а не «сходи по такому-то
 * URL». Поэтому префикс сервера, роуты и авторизация (через хостовый $api)
 * остаются здесь и в remote не протекают.
 */
export function createPort(server: string): ProcessHostPort {
    const base = buildUrl(server);
    const listeners = new Set<(e: HostEvent) => void>();
    const emit = (event: HostEvent) => listeners.forEach((l) => l(event));

    // uuid окна формы ноды — один на ноду, чтобы повторный клик переоткрывал
    // то же окно, а не плодил новые.
    const winIdFor = (ref: NodeFormRef) => `flow-node:${ref.processId}:${ref.nodeId}`;

    const nodeFormUrl = (ref: NodeFormRef) =>
        `${base}/${PROCESS_ROUTE}/nodes/${ref.formService}/form/metadata/${encodeURIComponent(ref.nodeId)}` +
        `?processId=${encodeURIComponent(ref.processId)}`;

    /**
     * Синтетическая запись для <Inspector>: FormBuilder ждёт NormalizedNode, но
     * нода канваса — не строка таблицы Metadata, у неё нет ни class_id, ни
     * owner_id. Заполняем ровно те поля, которые FormBuilder читает.
     */
    const syntheticNode = (ref: NodeFormRef, title: string) => ({
        nodeKey: winIdFor(ref),
        id: ref.nodeId,
        name: title,
        description: title,
        crud: ['r', 'u'],
        needToLoading: false,
        ownerId: ref.processId,
        classId: null,
        class: ref.formService,
        routes: `${PROCESS_ROUTE}/nodes/${ref.formService}/form`,
        parentId: ref.processId,
        childrenIds: [],
        depth: 1,
        expandable: false,
        isExpanded: false,
        isLoading: false,
        isLoaded: true,
        sortOrder: undefined,
        loadStatus: undefined,
        loadStrategy: 'eager' as const,
        events: {},
        icon: null,
    });

    /**
     * Своё сохранение вместо штатного InspectorWindow.onSave: тот кладёт в
     * owner_id значение classId, а backend резолвит процесс как
     * `req.query.processId || req.body.owner_id` — с чужим значением процесс не
     * находится. processId шлём и в query, и в теле.
     */
    const saveNodeForm = (ref: NodeFormRef, values: Record<string, unknown>) =>
        $api.put(nodeFormUrl(ref), { owner_id: ref.processId, settings: values });

    /** Поля формы ноды, которые канвас рисует сам. Остальное живёт только на backend. */
    const canvasPatch = (values: Record<string, unknown>): Record<string, unknown> => ({
        label: values.title,
        _containerProps: { fill: values['containerProps.fill'] },
        _textProps: { color: values['textProps.color'] },
    });

    return {
        loadSchema: (processId) =>
            $api
                .get(`${base}/${PROCESS_ROUTE}/metadata/${encodeURIComponent(processId)}/schema`)
                .then((r: { data: ProcessSchema }) => r.data),

        saveSchema: async (processId, schema) => {
            // Схему пишет кнопка «Сохранить» инспектора, а не канвас.
            // Metadata.model.upd перезаписывает manifest целиком, без мерджа,
            // поэтому два независимых писателя гарантированно затирают друг
            // друга. Канвас только публикует актуальное состояние — забирает
            // его InspectorWindow._injectCanvasSchema по этому самому ключу.
            StateManager.setState({ [`flowdemoCanvas:${processId}`]: schema });
        },

        openNodeForm: (ref) => {
            if (!ref) return;

            $api.get(nodeFormUrl(ref))
                .then((res: { data: any }) => {
                    const form = res.data;
                    const title = form?.manifest?.name || ref.formService;
                    const node = syntheticNode(ref, title);
                    const winId = winIdFor(ref);

                    const onSave = (values: Record<string, unknown>, afterSave: (next: Record<string, unknown>) => void) => {
                        saveNodeForm(ref, values)
                            .then(() => {
                                afterSave(values);
                                emit({ type: 'node-saved', nodeId: ref.nodeId, patch: canvasPatch(values) });
                                $message.show('Значение сохранено!');
                            })
                            .catch((e: unknown) => {
                                console.error('[Flowdemo] Ошибка сохранения формы ноды', e);
                                $message.show('Ошибка при сохранении!');
                            });
                    };

                    $windows.open(
                        title,
                        <Inspector
                            server={server}
                            formData={form}
                            node={node as any}
                            onSave={onSave as any}
                            type={form?.type}
                            winId={winId}
                        />,
                        // Без position — значит плавающее окно Window, а не
                        // правая панель: там живёт форма процесса с кнопкой,
                        // которая сохраняет схему. Заняв панель формой ноды,
                        // мы бы убрали её с экрана.
                        { uuid: winId, width: '520px', height: 'fit-content' },
                    );
                })
                .catch((e: unknown) => {
                    console.error('[Flowdemo] Не удалось загрузить форму ноды', e);
                    $message.show('Ошибка загрузки формы ноды');
                });
        },

        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
