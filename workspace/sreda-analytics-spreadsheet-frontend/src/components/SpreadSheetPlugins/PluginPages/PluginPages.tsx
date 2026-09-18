import React, { useRef, useState } from 'react';
import { Tab, Tabs, Tooltip } from 'ui-kit';

import { Cell } from '../../AdapterSpreadSheet/models';
import { Plugin, SpreadsheetAction, Transaction } from '../../AdapterSpreadSheet/plugin';
import PageTab from './components/PageTab';
import { PLUGIN_PAGES_KEY } from './constants';
import { IPageData, PluginPagesOptions, PluginPagesState } from './types';

export class PluginPages extends Plugin<typeof PLUGIN_PAGES_KEY, PluginPagesState, PluginPagesOptions> {
    readonly key = PLUGIN_PAGES_KEY;

    readonly initialState: PluginPagesState = this._buildInitialState();

    private _buildInitialState(): PluginPagesState {
        const initial = this.options?.initialPages;
        if (initial?.length) {
            return {
                pages: initial.map((p, i) => ({
                    id: p.id,
                    name: p.name,
                    dataSnapshot: [],
                    stylesSnapshot: null,
                    pluginConfigSnapshot: null,
                    cursorSnapshot: null,
                })),
                activePageId: initial[0].id,
            };
        }
        return {
            pages: [
                {
                    id: 'sheet1',
                    name: 'Лист 1',
                    dataSnapshot: [],
                    stylesSnapshot: null,
                    pluginConfigSnapshot: null,
                    cursorSnapshot: null,
                },
            ],
            activePageId: 'sheet1',
        };
    }

    // ─── Reducer ─────────────────────────────────────────────────────────────

    override reducer(state: PluginPagesState, tr: Transaction): PluginPagesState {
        const { action } = tr;
        switch (action?.type) {
            case 'PAGE_ADD': {
                const id = `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                const name = action.payload.name ?? `Лист ${state.pages.length + 1}`;
                return {
                    ...state,
                    pages: [
                        ...state.pages,
                        {
                            id,
                            name,
                            dataSnapshot: [],
                            stylesSnapshot: null,
                            pluginConfigSnapshot: null,
                            cursorSnapshot: null,
                        },
                    ],
                };
            }

            case 'PAGE_REMOVE': {
                if (state.pages.length <= 1) return state;
                const pages = state.pages.filter((p) => p.id !== action.payload.id);
                const activePageId = state.activePageId === action.payload.id ? pages[0]?.id ?? null : state.activePageId;
                return { ...state, pages, activePageId };
            }

            case 'PAGE_RENAME':
                return {
                    ...state,
                    pages: state.pages.map((p) => (p.id === action.payload.id ? { ...p, name: action.payload.name } : p)),
                };

            case 'PAGE_SWITCH':
                return { ...state, activePageId: action.payload.id };

            case 'PAGE_SAVE_SNAPSHOT':
                return {
                    ...state,
                    pages: state.pages.map((p) => (p.id === action.payload.id ? { ...p, ...action.payload.data } : p)),
                };

            case 'PAGE_REORDER': {
                const pages = [...state.pages];
                const [item] = pages.splice(action.payload.fromIndex, 1);
                pages.splice(action.payload.toIndex, 0, item);
                return { ...state, pages };
            }

            default:
                return state;
        }
    }

    // ─── appendTransaction ────────────────────────────────────────────────────

    override appendTransaction(tr: Transaction, prevState: PluginPagesState, nextState: PluginPagesState) {
        if (tr.action?.type !== 'PAGE_SWITCH') return null;
        const { id } = tr.action.payload;
        if (id === prevState.activePageId) return null;

        const actions: SpreadsheetAction[] = [];

        // 1. Сохраняем позицию курсора текущего листа
        if (prevState.activePageId) {
            const cursorState = this.context.getPluginState('PluginCursorCell');
            const activeCursor = cursorState?.ranges?.[0]?.cursor?.coordinates ?? null;

            actions.push({
                type: 'PAGE_SAVE_SNAPSHOT',
                payload: {
                    id: prevState.activePageId,
                    data: {
                        dataSnapshot: this._serializeMatrix(this.context.getData()),
                        stylesSnapshot: this.context.styleManager.export(),
                        pluginConfigSnapshot: this.context.pluginConfigManager.export(),
                        cursorSnapshot: activeCursor,
                    },
                },
            });
        }

        // 2. Восстанавливаем данные
        const targetPage = nextState.pages.find((p) => p.id === id) ?? prevState.pages.find((p) => p.id === id);

        if (targetPage) {
            this._restorePageSilent(targetPage);
        }

        // 3. Восстанавливаем курсор (или дефолт 0,0)
        const savedCursor = targetPage?.cursorSnapshot ?? { rowIndex: 0, columnIndex: 0 };
        actions.push({
            type: 'CURSOR_SET',
            payload: { cell: new Cell(savedCursor) },
        });

        // 4. Пересчёт формул
        // actions.push({ type: 'DATA_LOADED' });

        return actions;
    }

    // ─── Сериализация / десериализация ───────────────────────────────────────

    private _serializeMatrix(matrix: ReadonlyMap<number, ReadonlyMap<number, any>>): [number, [number, any][]][] {
        const result: [number, [number, any][]][] = [];
        for (const [row, rowMap] of matrix) {
            result.push([row, Array.from(rowMap.entries())]);
        }
        return result;
    }

    private _restorePageSilent(page: IPageData): void {
        const snap = new Map<number, Map<number, any>>(page.dataSnapshot.map(([r, cols]) => [r, new Map(cols)]));
        // silentRestore не вызывает onUpdate — обновление придёт от dispatchTransaction
        // TODO
        // this.context.restoreDataMatrixSilent(snap);
        // this.context.restoreManagersSilent(page.stylesSnapshot, page.pluginConfigSnapshot);
    }

    // ─── Публичный API для PluginFormulas ─────────────────────────────────────

    /**
     * Получить матрицу данных листа по имени.
     * Если name === имя активного листа — возвращает живую матрицу через context.
     * Иначе — десериализует snapshot (read-only копия).
     */
    getPageMatrix(pageName: string): Map<number, Map<number, any>> | null {
        const state = this.getState();
        const activePage = state.pages.find((p) => p.id === state.activePageId);

        if (activePage?.name === pageName) {
            // Активный лист — возвращаем живые данные
            const result = new Map<number, Map<number, any>>();
            for (const [row, rowMap] of this.context.getData()) {
                result.set(row, new Map(rowMap));
            }
            return result;
        }

        const page = state.pages.find((p) => p.name === pageName);
        if (!page) return null;

        return new Map<number, Map<number, any>>(page.dataSnapshot.map(([r, cols]) => [r, new Map(cols)]));
    }

    getActivePageName(): string | null {
        const state = this.getState();
        return state.pages.find((p) => p.id === state.activePageId)?.name ?? null;
    }

    // ─── Export / Import ─────────────────────────────────────────────────────

    override async export() {
        const state = this.getState();
        // Активный лист не хранит снапшот, т.к. его данные уже попадают в payload на верхнем уровне, а неактивные листы сохраняются в appendTransaction при PAGE_SWITCH.
        const activeId = state.activePageId;
        const pages = state.pages.map((p) =>
            p.id === activeId
                ? {
                      ...p,
                      dataSnapshot: [],
                      stylesSnapshot: null,
                      pluginConfigSnapshot: null,
                  }
                : p,
        );
        return { key: this.key, state: { ...state, pages } };
    }

    override async import(data: { key: string; state: PluginPagesState }): Promise<void> {
        const { pages, activePageId } = data.state;
        for (const page of pages) {
            this.context.dispatch(
                {
                    type: 'PAGE_SAVE_SNAPSHOT',
                    payload: { id: page.id, data: page },
                },
                { skipHistory: true },
            );
        }
        if (activePageId) {
            const target = pages.find((p) => p.id === activePageId);
            if (target) this._restorePageSilent(target);
            this.context.dispatch({ type: 'PAGE_SWITCH', payload: { id: activePageId } }, { skipHistory: true });
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        const { pages, activePageId } = this.getState();

        return (
            <Tooltip
                content="Функционал в разработке, но скоро станет доступен"
                rootId={document.fullscreenElement ? 'fullscreen-portals' : undefined}
            >
                <Tabs style={{ fontSize: 13 }}>
                    <Tab label="Страница 1" disabled />
                    <Tab label="Страница 2" disabled />
                    <Tab label="Страница 3" disabled />
                </Tabs>
            </Tooltip>
        );
    }
}

// <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
//     <div style={{ display: 'flex', overflowX: 'auto', flex: 1 }}>
//         {pages.map((page, index) => (
//             <PageTab
//                 key={page.id}
//                 page={page}
//                 isActive={page.id === activePageId}
//                 canRemove={pages.length > 1}
//                 onActivate={() =>
//                     this.context.dispatch({ type: 'PAGE_SWITCH', payload: { id: page.id } }, { skipHistory: true })
//                 }
//                 onRename={(name) => this.context.dispatch({ type: 'PAGE_RENAME', payload: { id: page.id, name } })}
//                 onRemove={() => this.context.dispatch({ type: 'PAGE_REMOVE', payload: { id: page.id } })}
//             />
//         ))}
//     </div>
//     <button
//         style={{ flexShrink: 0, padding: '4px 8px', cursor: 'pointer' }}
//         title="Добавить лист"
//         onClick={() => this.context.dispatch({ type: 'PAGE_ADD', payload: {} })}
//     >
//         +
//     </button>
// </div>
