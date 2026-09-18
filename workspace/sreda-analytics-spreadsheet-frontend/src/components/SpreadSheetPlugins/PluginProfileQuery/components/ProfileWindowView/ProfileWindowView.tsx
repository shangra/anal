import React, { FC } from 'react';
import { Button, DropDownIcon, DropRightIcon, ErrorIcon, Table, TableBody, TableCell, TableHead, TableRow } from 'ui-kit';

import QueryTimeline from '../QueryTimeline/QueryTimeline';

interface IRequestWithMetrics {
    answerId: string;
    requestId: string;
    plan: any;
    index: number;
    startTime: number;
    endTime: number;
    duration: number;
    rowCount: number;
    queryTime: number;
    isCompleted: boolean;
    hasError: boolean;
    isExpired?: boolean;
    error?: {
        message: string;
        stack?: string;
        status?: number;
        code?: string;
        errors?: Array<{ message: string; stack: string }>;
    };
}

interface IProfileWindowViewProps {
    requests: IRequestWithMetrics[];
    expandedRequest: string | null;
    selectedContext: string | null;
    metaCache: Record<string, { loading: boolean; data: any; error: string | null }>;
    onToggleRequest: (id: string | null) => void;
    onStepClick: (context: string) => void;
    onClear: () => void;
}

const fmtTime = (t: number) => {
    if (!t) return '...';
    return new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' } as any);
};

const fmtMs = (ms: number) => {
    if (!ms || ms < 0) return '...';
    // eslint-disable-next-line no-nested-ternary
    return ms < 1 ? '<1ms' : ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
};

const ProfileWindowView: FC<IProfileWindowViewProps> = ({
    requests,
    expandedRequest,
    selectedContext,
    metaCache,
    onToggleRequest,
    onStepClick,
    onClear,
}) => {
    const firstTime = requests[0]?.startTime ?? 0;
    const lastTime = requests[requests.length - 1]?.endTime ?? 0;
    const totalTime = lastTime - firstTime || 1;

    if (!requests.length) {
        return (
            <div
                style={{
                    padding: 'var(--ui-kit-spacing-10)',
                    textAlign: 'center',
                    color: 'var(--ui-kit-colors-text-tertiary)',
                    background: 'var(--ui-kit-colors-background-primary)',
                    height: '100%',
                }}
            >
                Ожидание запросов...
            </div>
        );
    }

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--ui-kit-colors-background-primary)',
                color: 'var(--ui-kit-colors-text-primary)',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: 'var(--ui-kit-spacing-3) var(--ui-kit-spacing-4)',
                    borderBottom: '1px solid var(--ui-kit-colors-border-primary)',
                    flexShrink: 0,
                }}
            >
                <Button onClick={onClear} size="small">
                    Очистить
                </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <Table size="small" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ width: '28%', padding: '4px 8px' }}>ID</TableCell>
                            <TableCell style={{ width: '10%', padding: '4px 4px' }}>Начало</TableCell>
                            <TableCell style={{ width: '10%', padding: '4px 4px' }}>Конец</TableCell>
                            <TableCell style={{ width: '8%', padding: '4px 2px' }}>Длит.</TableCell>
                            <TableCell style={{ width: '5%', padding: '4px 2px' }}>Строк</TableCell>
                            <TableCell style={{ width: '7%', padding: '4px 2px' }}>БД</TableCell>
                            <TableCell style={{ width: '29%', padding: '4px 4px' }}>Timeline</TableCell>
                            <TableCell style={{ width: '3%', padding: '4px 2px' }} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {requests.map((req) => {
                            const left = req.startTime ? ((req.startTime - firstTime) / totalTime) * 100 : 0;
                            const width = req.duration ? Math.max((req.duration / totalTime) * 100, 0.5) : 0.5;
                            const isExpanded = expandedRequest === req.answerId;

                            return (
                                <React.Fragment key={req.requestId}>
                                    <TableRow
                                        onClick={() => onToggleRequest(isExpanded ? null : req.answerId)}
                                        style={{
                                            cursor: 'pointer',
                                            background: req.isExpired
                                                ? 'var(--ui-kit-colors-background-disabled)'
                                                : req.hasError
                                                ? 'var(--ui-kit-colors-alert-error-background)'
                                                : isExpanded
                                                ? 'var(--ui-kit-colors-background-highlighted)'
                                                : undefined,
                                            opacity: req.isExpired ? 0.5 : 1,
                                            transition: 'opacity 0.3s, background 0.3s',
                                        }}
                                    >
                                        <TableCell style={{ overflow: 'hidden', padding: '4px 8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                                                {req.isExpired && (
                                                    <span
                                                        style={{ flexShrink: 0 }}
                                                        title="Данные устарели и могут быть недоступны"
                                                    >
                                                        Данные устарели и могут быть недоступны
                                                    </span>
                                                )}
                                                {req.hasError && <ErrorIcon size="small" color="error" />}
                                                <span
                                                    style={{
                                                        whiteSpace: 'nowrap',
                                                        fontSize: 11,
                                                        color: req.isExpired
                                                            ? 'var(--ui-kit-colors-text-disabled)'
                                                            : undefined,
                                                        textDecoration: req.isExpired ? 'line-through' : 'none',
                                                    }}
                                                    title={req.isExpired ? `${req.answerId} (устарел)` : req.answerId}
                                                >
                                                    {req.answerId}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell style={{ whiteSpace: 'nowrap', padding: '4px 4px', fontSize: 11 }}>
                                            {fmtTime(req.startTime)}
                                        </TableCell>
                                        <TableCell style={{ whiteSpace: 'nowrap', padding: '4px 4px', fontSize: 11 }}>
                                            {req.isCompleted ? fmtTime(req.endTime) : '...'}
                                        </TableCell>
                                        <TableCell style={{ whiteSpace: 'nowrap', padding: '4px 2px', fontSize: 11 }}>
                                            {req.isCompleted ? fmtMs(req.duration) : '...'}
                                        </TableCell>
                                        <TableCell style={{ padding: '4px 2px', fontSize: 11 }}>
                                            {req.rowCount || '-'}
                                        </TableCell>
                                        <TableCell style={{ whiteSpace: 'nowrap', padding: '4px 2px', fontSize: 11 }}>
                                            {req.queryTime ? fmtMs(req.queryTime * 1000) : '-'}
                                        </TableCell>
                                        <TableCell style={{ padding: '4px 4px' }}>
                                            <div
                                                style={{
                                                    height: 12,
                                                    background: 'var(--ui-kit-colors-background-control)',
                                                    borderRadius: 'var(--ui-kit-spacing-1)',
                                                    position: 'relative',
                                                    width: '100%',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        height: '100%',
                                                        background: req.isExpired
                                                            ? 'var(--ui-kit-colors-text-disabled)'
                                                            : req.hasError
                                                            ? 'var(--ui-kit-colors-alert-error)'
                                                            : 'var(--ui-kit-colors-basic-primary)',
                                                        borderRadius: 'var(--ui-kit-spacing-1)',
                                                        minWidth: 2,
                                                        left: `${left}%`,
                                                        width: `${width}%`,
                                                        opacity: req.isCompleted ? 1 : 0.6,
                                                    }}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell style={{ textAlign: 'center', padding: '4px 2px' }}>
                                            {isExpanded ? <DropDownIcon size="small" /> : <DropRightIcon size="small" />}
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                        <TableRow>
                                            <TableCell colSpan={8} style={{ padding: 0 }}>
                                                <div
                                                    style={{
                                                        background: req.isExpired
                                                            ? 'var(--ui-kit-colors-background-disabled)'
                                                            : req.hasError
                                                            ? 'var(--ui-kit-colors-alert-error-background)'
                                                            : 'var(--ui-kit-colors-background-secondary)',
                                                        borderTop: `2px solid ${
                                                            req.isExpired
                                                                ? 'var(--ui-kit-colors-text-disabled)'
                                                                : req.hasError
                                                                ? 'var(--ui-kit-colors-alert-error)'
                                                                : 'var(--ui-kit-colors-basic-primary)'
                                                        }`,
                                                        borderBottom: '1px solid var(--ui-kit-colors-border-primary)',
                                                        marginLeft: 0,
                                                        width: '100%',
                                                        overflow: 'hidden',
                                                        opacity: req.isExpired ? 0.7 : 1,
                                                    }}
                                                >
                                                    {req.isExpired && (
                                                        <div
                                                            style={{
                                                                padding: '6px 12px',
                                                                background: 'var(--ui-kit-colors-background-disabled)',
                                                                color: 'var(--ui-kit-colors-text-disabled)',
                                                                fontSize: 11,
                                                                textAlign: 'center',
                                                                borderBottom: '1px solid var(--ui-kit-colors-border-primary)',
                                                            }}
                                                        >
                                                            Данные запроса устарели и могут быть недоступны
                                                        </div>
                                                    )}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 'var(--ui-kit-spacing-1)',
                                                            padding: 'var(--ui-kit-spacing-2) var(--ui-kit-spacing-4)',
                                                            background: req.isExpired
                                                                ? 'var(--ui-kit-colors-background-disabled)'
                                                                : req.hasError
                                                                ? 'var(--ui-kit-colors-alert-error-background)'
                                                                : 'var(--ui-kit-colors-background-tertiary)',
                                                            borderBottom: '1px solid var(--ui-kit-colors-border-primary)',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 'var(--ui-kit-spacing-4)',
                                                                flexWrap: 'wrap',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    color: 'var(--ui-kit-colors-text-secondary)',
                                                                    fontSize: 10,
                                                                }}
                                                            >
                                                                ID:
                                                            </span>
                                                            <span
                                                                style={{
                                                                    color: 'var(--ui-kit-colors-text-primary)',
                                                                    userSelect: 'text',
                                                                    fontSize: 11,
                                                                    wordBreak: 'break-all',
                                                                }}
                                                            >
                                                                {req.answerId}
                                                            </span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 'var(--ui-kit-spacing-4)',
                                                                flexWrap: 'wrap',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            {req.startTime ? (
                                                                <>
                                                                    <span
                                                                        style={{
                                                                            color: 'var(--ui-kit-colors-text-secondary)',
                                                                            fontSize: 10,
                                                                        }}
                                                                    >
                                                                        Начало:
                                                                    </span>
                                                                    <span style={{ fontSize: 11 }}>
                                                                        {fmtTime(req.startTime)}
                                                                    </span>
                                                                </>
                                                            ) : null}
                                                            {req.isCompleted && req.endTime ? (
                                                                <>
                                                                    <span
                                                                        style={{
                                                                            color: 'var(--ui-kit-colors-text-secondary)',
                                                                            fontSize: 10,
                                                                        }}
                                                                    >
                                                                        Конец:
                                                                    </span>
                                                                    <span style={{ fontSize: 11 }}>
                                                                        {fmtTime(req.endTime)}
                                                                    </span>
                                                                    {req.hasError && (
                                                                        <span
                                                                            style={{
                                                                                color: 'var(--ui-kit-colors-alert-error)',
                                                                                fontSize: 11,
                                                                                fontWeight: 'bold',
                                                                            }}
                                                                        >
                                                                            Завершён с ошибкой
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span
                                                                    style={{
                                                                        color: 'var(--ui-kit-colors-text-secondary)',
                                                                        fontSize: 10,
                                                                    }}
                                                                >
                                                                    Выполняется...
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: 'var(--ui-kit-spacing-2)', overflowX: 'auto' }}>
                                                        <QueryTimeline
                                                            plan={req.plan}
                                                            metaCache={metaCache}
                                                            selectedContext={selectedContext}
                                                            onStepClick={onStepClick}
                                                            isCompleted={req.isCompleted}
                                                            hasError={req.hasError}
                                                            isExpired={req.isExpired}
                                                            renderStepMeta={(context, data, loading, error) => {
                                                                if (loading)
                                                                    return (
                                                                        <div
                                                                            style={{
                                                                                padding: 'var(--ui-kit-spacing-4)',
                                                                                color: 'var(--ui-kit-colors-text-secondary)',
                                                                            }}
                                                                        >
                                                                            Загрузка...
                                                                        </div>
                                                                    );
                                                                if (error)
                                                                    return (
                                                                        <div
                                                                            style={{
                                                                                padding: 'var(--ui-kit-spacing-4)',
                                                                                color: 'var(--ui-kit-colors-alert-error)',
                                                                            }}
                                                                        >
                                                                            {error}
                                                                        </div>
                                                                    );
                                                                if (!data) return null;

                                                                const meta = data?.meta ?? data;

                                                                // eslint-disable-next-line no-nested-ternary
                                                                const content = meta?.query
                                                                    ? typeof meta.query === 'object'
                                                                        ? JSON.stringify(meta.query, null, 2)
                                                                        : meta.query
                                                                    : JSON.stringify(meta, null, 2);

                                                                const formattedContent = content
                                                                    .replace(/\\n/g, '\n')
                                                                    .replace(/\\t/g, '\t');

                                                                const isSql = !!meta?.query;

                                                                return (
                                                                    <div>
                                                                        <pre
                                                                            style={{
                                                                                margin: 0,
                                                                                padding: 'var(--ui-kit-spacing-6)',
                                                                                whiteSpace: 'pre-wrap',
                                                                                wordBreak: 'break-word',
                                                                                background: isSql
                                                                                    ? 'var(--ui-kit-colors-armBackgroundDeep)'
                                                                                    : 'var(--ui-kit-colors-background-primary)',
                                                                                border: '1px solid var(--ui-kit-colors-border-primary)',
                                                                                borderRadius: 'var(--ui-kit-spacing-2)',
                                                                                color: 'var(--ui-kit-colors-text-primary)',
                                                                                userSelect: 'text',
                                                                                cursor: 'text',
                                                                                maxWidth: '100%',
                                                                                overflow: 'auto',
                                                                            }}
                                                                        >
                                                                            {formattedContent}
                                                                        </pre>
                                                                    </div>
                                                                );
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default ProfileWindowView;
