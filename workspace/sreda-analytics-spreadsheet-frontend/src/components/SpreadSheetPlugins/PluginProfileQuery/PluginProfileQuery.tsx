import React from 'react';
import { v4 as uuidv4 } from 'uuid';

import $api from '../../../helpers/axios';
import { Plugin, SpreadsheetAction, Transaction } from '../../AdapterSpreadSheet/plugin';
import $windows from '../../ui/windows.helper';
import { IconButton } from '../../UIKit/IconButton';
import { DroidIcon } from '../../UiKitIcons';
import { PIVOT_ACTION as NEW_PIVOT_ACTION } from '../NewPluginPivot/constants';
import { PIVOT_ACTION } from '../PluginPivot/constants';
import { REPORTS_ACTION } from '../PluginReports/constants';
import ProfileWindow from './components/ProfileWindow';
import { PLUGIN_PROFILE_QUERY_KEY, PROFILE_QUERY_ACTION } from './constants';
import styles from './styles.module.css';
import {
    IPluginProfileQueryAddRequestPayload,
    IPluginProfileQueryRequest,
    IPluginProfileQueryUpdateRequestPayload,
    PluginProfileQueryOptions,
    PluginProfileQueryState,
} from './types';

export class PluginProfileQuery extends Plugin<
    typeof PLUGIN_PROFILE_QUERY_KEY,
    PluginProfileQueryState,
    PluginProfileQueryOptions
> {
    readonly key = PLUGIN_PROFILE_QUERY_KEY;

    readonly initialState: PluginProfileQueryState = {
        explain: false,
        requests: [],
    };

    // ─── Идентификатор окна профилировщика (стабилен на всё время жизни плагина) ──

    private readonly _windowUuid = uuidv4();

    // ─── Reducer ─────────────────────────────────────────────────────────────

    override reducer(state: PluginProfileQueryState, tr: Transaction): PluginProfileQueryState {
        switch (tr.action?.type) {
            // Профилировщик открыт — включаем перехват запросов
            case PROFILE_QUERY_ACTION.OPEN:
                return { ...state, explain: true };

            // Профилировщик закрыт — выключаем перехват
            case PROFILE_QUERY_ACTION.CLOSE:
                return { ...state, explain: false };

            // Новый запрос с планом выполнения получен с сервера
            case PROFILE_QUERY_ACTION.ADD_REQUEST: {
                const { requestId, answerId, plan, error } = tr.action.payload as IPluginProfileQueryAddRequestPayload;
                const existingIndex = state.requests.findIndex(
                    (r) => r.requestId === requestId || (answerId && r.answerId === answerId),
                );

                const newRequests = [...state.requests];

                if (existingIndex >= 0) {
                    // Обновляем существующий запрос
                    newRequests[existingIndex] = {
                        ...newRequests[existingIndex],
                        ...(answerId !== undefined && { answerId }),
                        ...(plan !== undefined && { plan }),
                        ...(error !== undefined && { error }),
                    };
                } else {
                    // Добавляем новый
                    newRequests.push({
                        requestId: requestId || answerId || '',
                        answerId: answerId || '',
                        plan,
                        error,
                    } as IPluginProfileQueryRequest);
                }

                const newState = { ...state, requests: newRequests };
                queueMicrotask(() => this._updateWindow());
                return newState;
            }

            // Обновляем запрос с теми данными, которые пришли на данный момент
            case PROFILE_QUERY_ACTION.UPDATE_REQUEST: {
                const { answerId, requestId, plan, error, expiresAt } = tr.action
                    .payload as IPluginProfileQueryUpdateRequestPayload;
                const newState = {
                    ...state,
                    requests: state.requests.map((req) => {
                        // Ищем и по answerId и по requestId
                        if ((answerId && req.answerId === answerId) || (requestId && req.requestId === requestId)) {
                            return {
                                ...req,
                                ...(plan !== undefined && { plan }),
                                ...(answerId && { answerId }),
                                ...(error !== undefined && { error }),
                                ...(expiresAt !== undefined && { expiresAt }),
                            };
                        }
                        return req;
                    }),
                };
                queueMicrotask(() => this._updateWindow());
                return newState;
            }

            case PROFILE_QUERY_ACTION.CLEAR_REQUESTS: {
                const clearedState = { ...state, requests: [] };
                // Обновляем окно после обновления стейта
                queueMicrotask(() => this._updateWindow());
                return clearedState;
            }

            default:
                return state;
        }
    }

    // ─── appendTransaction: реакция на события PluginPivot / PluginReports ────

    /**
     * Заменяет subscribesEvents() из старой архитектуры.
     *
     * Обрабатывает четыре типа событий:
     *
     * 1. ON_FETCH_START — мутирует options.explain = true.
     *    Мутация намеренна: GetTableData.getTableData() передаёт ТОТ ЖЕ объект options
     *    в getRawPivotData(), вызываемый сразу после dispatch. Так как dispatch
     *    синхронен, мутация происходит до начала запроса. ✓
     *
     * 2. ON_FETCH_WAIT — сервер вернул статус 'wait', значит запрос ещё выполняется.
     *    На этом этапе уже известен answerId, поэтому синхронно обновляем существующую
     *    запись по requestId, добавляя в неё answerId. Затем асинхронно запрашиваем
     *    актуальный план выполнения (explain) с сервера.
     *
     * 3. ON_FETCH_END — запрашивает план выполнения (explain) с сервера.
     *    Предварительно синхронно обновляем answerId в стейте, если он ещё не был добавлен.
     *    Используем queueMicrotask для defer-а async-операции за пределы
     *    транзакционного цикла.
     *
     * 4. PLUGIN_FETCH_ERROR/EVENT — Произошла ошибка при выполнении запроса.
     *    Запрашиваем полный план выполнения через _fetchExplainData.
     *    Если нет answerId, пытаемся найти его в текущем состоянии по requestId.
     */
    override appendTransaction(
        tr: Transaction,
        _prevState: PluginProfileQueryState,
        nextState: PluginProfileQueryState,
    ): SpreadsheetAction[] | SpreadsheetAction | null {
        if (!tr.action || !nextState.explain) return null;

        const { type, payload } = tr.action;

        // ── Начало запроса ────────────────────────────────────────────────────
        const isFetchStart =
            type === PIVOT_ACTION.ON_FETCH_START ||
            type === NEW_PIVOT_ACTION.ON_FETCH_START ||
            type === REPORTS_ACTION.ON_FETCH_START;

        if (isFetchStart) {
            const { options, requestId } = (payload || {}) as {
                options?: Record<string, any>;
                requestId?: string;
            };

            if (options) {
                options.explain = true;
            }

            if (requestId) {
                return {
                    type: PROFILE_QUERY_ACTION.ADD_REQUEST,
                    payload: { requestId } as IPluginProfileQueryAddRequestPayload,
                };
            }

            return null;
        }

        // WAIT — синхронно обновляем answerId, затем асинхронно запрашиваем explain
        const isFetchWait =
            type === PIVOT_ACTION.ON_FETCH_WAIT ||
            type === NEW_PIVOT_ACTION.ON_FETCH_WAIT ||
            type === REPORTS_ACTION.ON_FETCH_WAIT;

        if (isFetchWait) {
            const { answerId, requestId } = (payload || {}) as {
                answerId?: string;
                requestId?: string;
                attempt?: number;
            };

            if (answerId && requestId) {
                // Синхронно обновляем answerId в стейте
                this.context.dispatch({
                    type: PROFILE_QUERY_ACTION.ADD_REQUEST,
                    payload: { requestId, answerId } as IPluginProfileQueryAddRequestPayload,
                });

                // Асинхронно запрашиваем explain
                queueMicrotask(() => void this._fetchExplainData(answerId));
            }
            return null;
        }

        // ERROR — произошла ошибка при запросе
        const isFetchError = type === 'PLUGIN_FETCH_ERROR/EVENT';

        if (isFetchError) {
            const { requestId, answerId } = (payload || {}) as {
                requestId?: string;
                answerId?: string;
            };

            // Если есть answerId, используем его
            if (answerId) {
                // Синхронно обновляем answerId в стейте если есть requestId
                if (requestId) {
                    this.context.dispatch({
                        type: PROFILE_QUERY_ACTION.ADD_REQUEST,
                        payload: { requestId, answerId } as IPluginProfileQueryAddRequestPayload,
                    });
                }

                // Запрашиваем полный план выполнения с детальной информацией об ошибках в шагах
                queueMicrotask(() => void this._fetchExplainData(answerId));
            }
            // Если answerId нет, но есть requestId, ищем answerId в состоянии
            else if (requestId) {
                const currentState = this.getState();
                const existingRequest = currentState.requests.find((r) => r.requestId === requestId);
                if (existingRequest?.answerId) {
                    queueMicrotask(() => void this._fetchExplainData(existingRequest.answerId));
                }
            }
            return null;
        }

        // END — синхронно обновляем answerId если нужно, затем запрашиваем финальный explain
        const isFetchEnd =
            type === PIVOT_ACTION.ON_FETCH_END ||
            type === NEW_PIVOT_ACTION.ON_FETCH_END ||
            type === REPORTS_ACTION.ON_FETCH_END;

        if (isFetchEnd) {
            const { data, requestId } = (payload || {}) as {
                data?: { answerId?: string };
                requestId?: string;
            };
            const answerId = data?.answerId;

            if (answerId) {
                // Синхронно убеждаемся, что запись с answerId существует в стейте
                if (requestId) {
                    this.context.dispatch({
                        type: PROFILE_QUERY_ACTION.ADD_REQUEST,
                        payload: { requestId, answerId } as IPluginProfileQueryAddRequestPayload,
                    });
                }

                // Асинхронно запрашиваем финальный explain
                queueMicrotask(() => void this._fetchExplainData(answerId));
            }
            return null;
        }
        return null;
    }

    // ─── Приватные методы ─────────────────────────────────────────────────────

    /**
     * Запрашивает с бека актуальный план выполнения запроса.
     * Сохраняет план как есть, со всеми шагами и ошибками в них.
     *
     * Ответ сервера содержит plan.steps, где каждый шаг может иметь:
     * - hasError: true - флаг ошибки в шаге
     * - error: { message, stack, status, ... } - детали ошибки
     *
     * Ошибки отображаются непосредственно в том шаге, где они произошли.
     */
    private async _fetchExplainData(answerId: string): Promise<void> {
        const { server = '' } = this.options as PluginProfileQueryOptions;

        try {
            const res = await $api.get(`${server}metadata/query-explain/${answerId}`);
            if (!res.data) return;

            // Сохраняем план как есть, без дополнительной обработки
            // Ошибки уже находятся в соответствующих шагах
            const plan = res.data.plan || res.data;
            const { expiresAt } = res.data;

            this.context.dispatch({
                type: PROFILE_QUERY_ACTION.UPDATE_REQUEST,
                payload: {
                    answerId,
                    plan,
                    expiresAt,
                } as IPluginProfileQueryUpdateRequestPayload,
            });
        } catch (e) {
            console.error('[PluginProfileQuery] Не удалось получить план запроса', e);
        }
    }

    /** Обновляет содержимое окна профилировщика */
    private _updateWindow(): void {
        const { server } = this.options as PluginProfileQueryOptions;
        const state = this.getState();

        $windows.open(
            'Профилировщик',
            <ProfileWindow
                requests={state.requests}
                server={server}
                onOpen={() => {}}
                onClose={() => this.context.dispatch({ type: PROFILE_QUERY_ACTION.CLOSE }, { skipHistory: true })}
                onClear={() => this.context.dispatch({ type: PROFILE_QUERY_ACTION.CLEAR_REQUESTS }, { skipHistory: true })}
            />,
            {
                uuid: this._windowUuid,
                portal: document.fullscreenElement ? document.getElementById('fullscreen-portals') : document.body,
            },
        );
    }

    /** Открывает окно профилировщика */
    private _onClickProfile = (): void => {
        this._updateWindow();
        this.context.dispatch({ type: PROFILE_QUERY_ACTION.OPEN }, { skipHistory: true });
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        return (
            <div className={styles.container}>
                <IconButton color="controlled" title="Профилировщик" icon={DroidIcon} onClick={this._onClickProfile} />
            </div>
        );
    }
}
