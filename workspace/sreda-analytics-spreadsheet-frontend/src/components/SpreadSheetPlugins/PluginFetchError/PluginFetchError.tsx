import React from 'react';
import { Alert, Card, CopyIcon, IconButton, Modal, Step, Stepper, Typography } from 'ui-kit';

import { Plugin, SpreadsheetAction, Transaction } from '../../AdapterSpreadSheet/plugin';
import { HelperContent } from './components/HelpContent';
import { PLUGIN_FETCH_ERROR_ACTION, PLUGIN_FETCH_ERROR_KEY } from './constants';
import { PluginFetchErrorEventPayload, PluginFetchErrorOptions, PluginFetchErrorState } from './types';

export class PluginFetchError extends Plugin<typeof PLUGIN_FETCH_ERROR_KEY, PluginFetchErrorState, PluginFetchErrorOptions> {
    readonly key = PLUGIN_FETCH_ERROR_KEY;

    readonly initialState: PluginFetchErrorState = {
        open: false,
    };

    statusCopy = React.createRef<HTMLParagraphElement>();

    // ─── Reducer ─────────────────────────────────────────────────────────────

    override reducer(state: PluginFetchErrorState, tr: Transaction): PluginFetchErrorState {
        switch (tr.action?.type) {
            // Открыть модал с данными ошибки
            case PLUGIN_FETCH_ERROR_ACTION.OPEN:
                return {
                    open: true,
                    title: tr.action.payload?.title,
                    status: tr.action.payload?.status,
                    message: tr.action.payload?.message,
                    stack: tr.action.payload?.stack,
                    errors: tr.action.payload?.errors,
                    description: tr.action.payload?.description,
                };

            // Закрыть модал (сбрасываем open, остальные поля сохраняем
            // чтобы не было мерцания при анимации закрытия)
            case PLUGIN_FETCH_ERROR_ACTION.CLOSE:
                return { ...state, open: false };

            default:
                return state;
        }
    }

    // ─── appendTransaction: реакция на PLUGIN_FETCH_ERROR/EVENT ──────────────

    /**
     * Перехватываем событие PLUGIN_FETCH_ERROR/EVENT, которое диспатчит любой
     * другой плагин (например, PluginPivot), и преобразуем
     * его в экшен PLUGIN_FETCH_ERROR_OPEN для нашего reducer-а.
     */
    override appendTransaction(
        tr: Transaction,
        _prevState: PluginFetchErrorState,
        _nextState: PluginFetchErrorState,
    ): SpreadsheetAction[] | SpreadsheetAction | null {
        if (tr.action?.type === PLUGIN_FETCH_ERROR_ACTION.EVENT) {
            const { title, status, message, stack, errors, payload } = tr.action.payload;

            return {
                type: PLUGIN_FETCH_ERROR_ACTION.OPEN,
                payload: {
                    title,
                    status,
                    message,
                    stack,
                    errors,
                    description: payload?.description ?? {},
                },
            };
        }

        return null;
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    handleCopyError() {
        const { status = 0, message = '', stack = '', errors = [] } = this.getState();

        navigator.clipboard.writeText(JSON.stringify({ link: window.location.href, status, message, errors, stack }));
        if (this.statusCopy.current) {
            this.statusCopy.current.textContent = 'Скопировано!';
            setTimeout(() => {
                this.statusCopy.current!.textContent = '';
            }, 2000);
        }
    }

    override render(): React.ReactElement | null {
        const {
            open = false,
            title = 'Ошибка',
            status = 0,
            message = '',
            stack = '',
            errors = [],
            description = { long: '', short: '' },
        } = this.getState();

        if (!open) return null;

        const options = this.options as PluginFetchErrorOptions;

        const _long =
            description.long ||
            'Вы можете воспользоваться кнопкой копирования исходной ошибки в правом верхнем углу текущего окна, либо перейти на следущий шаг и выполнить предложенные действия.';

        const long = _long.split('\n').map((line: string, index: number) => (
            <span key={index}>
                {line}
                {index < _long.split('\n').length - 1 && <br />}
            </span>
        ));

        return (
            <Modal
                opened={open}
                onSetOpen={(v) => {
                    if (!v) {
                        this.context.dispatch(
                            { type: PLUGIN_FETCH_ERROR_ACTION.CLOSE, payload: undefined },
                            { skipHistory: true },
                        );
                    }
                }}
                style={{ width: '560px' }}
                title={title}
            >
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <div>Код ошибки: {status}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Typography color="success" ref={this.statusCopy} />
                        <IconButton
                            onClick={() => this.handleCopyError()}
                            size="small"
                            color="controlled"
                            icon={CopyIcon}
                            variant="contained"
                        />
                    </div>
                </div>

                <Typography style={{ marginTop: '8px' }} color="primary" variant="body">
                    {message}
                </Typography>
                <Alert style={{ margin: '16px 0px' }} fullWidth hideClose color="error">
                    {description.short || 'На текущий момент нет подробного описания ошибки, но мы работаем над этим. '}
                </Alert>

                <Stepper linear={false}>
                    <Step title="Решение">
                        <Card fullWidth style={{ height: '188px' }}>
                            {long}
                        </Card>
                    </Step>
                    <Step title="Если не помогло">
                        <HelperContent
                            helpers={options.helpers || []}
                            title={title}
                            status={status}
                            message={message}
                            errors={errors}
                            stack={stack}
                        />
                    </Step>
                </Stepper>
            </Modal>
        );
    }
}
