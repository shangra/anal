import React, { FC, useCallback, useMemo, useState } from 'react';
import { Button, DropDownIcon, DropRightIcon, SearchIcon } from 'ui-kit';

interface IStep {
    date: string;
    message: string;
    context?: string | null | IStep[];
    type?: string;
    method?: string;
    class?: string;
    duration?: number;
    hasError?: boolean;
    error?: {
        message: string;
        stack?: string;
        status?: number;
        errors?: any[];
        timestamp?: string;
    };
}

interface INestedStep extends IStep {
    context: IStep[];
}

interface IFlatStep extends IStep {
    context: string | null;
}

interface IPlan {
    answerId: string;
    steps: IStep[];
}

interface IQueryTimelineProps {
    plan: IPlan;
    metaCache: Record<string, { loading: boolean; data: any; error: string | null }>;
    selectedContext: string | null;
    onStepClick: (context: string) => void;
    renderStepMeta?: (context: string, data: any, loading: boolean, error: string | null) => React.ReactNode;
    isCompleted?: boolean;
    hasError?: boolean;
    isExpired?: boolean;
}

// eslint-disable-next-line no-nested-ternary
const fmtMs = (ms: number) => (ms < 1 ? '<1ms' : ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`);

const fmtTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const STYLES = {
    expandIcon: {
        minWidth: 16,
        width: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
    },
    time: {
        minWidth: 55,
        width: 55,
        color: 'var(--ui-kit-colors-text-tertiary)',
        fontSize: 11,
        whiteSpace: 'nowrap' as const,
    },
    offset: {
        minWidth: 55,
        width: 55,
        color: 'var(--ui-kit-colors-text-tertiary)',
        fontSize: 11,
        whiteSpace: 'nowrap' as const,
    },
    duration: {
        minWidth: 50,
        width: 50,
        textAlign: 'right' as const,
        color: 'var(--ui-kit-colors-text-tertiary)',
        fontSize: 11,
        whiteSpace: 'nowrap' as const,
    },
    stepsCount: {
        minWidth: 20,
        width: 20,
        textAlign: 'center' as const,
        color: 'var(--ui-kit-colors-text-tertiary)',
        fontSize: 10,
    },
    searchIcon: {
        minWidth: 16,
        width: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
};

const QueryTimeline: FC<IQueryTimelineProps> = ({
    plan,
    metaCache,
    selectedContext,
    onStepClick,
    renderStepMeta,
    isCompleted = false,
    hasError = false,
    isExpired = false,
}) => {
    const [copiedContext, setCopiedContext] = useState<string | null>(null);
    const [expandedNestedNodes, setExpandedNestedNodes] = useState<Record<string, boolean>>({});
    const [expandedErrors, setExpandedErrors] = useState<Record<string, boolean>>({});

    const handleCopy = useCallback(async (text: string, context: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedContext(context);
            setTimeout(() => setCopiedContext(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, []);

    const { steps, totalDuration, startTime, maxDepth } = useMemo(() => {
        if (!plan?.steps?.length) return { steps: [], totalDuration: 0, startTime: 0, maxDepth: 0 };

        const first = new Date(plan.steps[0].date).getTime();
        const last = new Date(plan.steps[plan.steps.length - 1].date).getTime();

        const getMaxDepth = (stepsList: IStep[], depth: number): number => {
            let max = depth;
            for (const step of stepsList) {
                if (Array.isArray(step.context)) {
                    const nested = getMaxDepth(step.context, depth + 1);
                    if (nested > max) max = nested;
                }
            }
            return max;
        };

        return {
            steps: plan.steps,
            totalDuration: last - first || 1,
            startTime: first,
            maxDepth: getMaxDepth(plan.steps, 0),
        };
    }, [plan]);

    const toggleNestedNode = useCallback((nodeKey: string) => {
        setExpandedNestedNodes((prev) => ({
            ...prev,
            [nodeKey]: !prev[nodeKey],
        }));
    }, []);

    const toggleErrorExpand = useCallback((nodeKey: string) => {
        setExpandedErrors((prev) => ({
            ...prev,
            [nodeKey]: !prev[nodeKey],
        }));
    }, []);

    // Рекурсивная функция рендеринга шагов
    const renderSteps = useCallback(
        (stepsToRender: IStep[], depth: number = 0, parentKey: string = '') =>
            stepsToRender.map((step, i) => {
                const stepTime = new Date(step.date).getTime();
                const stepDuration = step.duration ?? 0;
                const offsetFromStart = stepTime - startTime;
                const timelineWidth = Math.max((stepDuration / totalDuration) * 100, 0.5);
                const timelineLeft = (offsetFromStart / totalDuration) * 100;

                const hasNestedSteps = Array.isArray(step.context);
                const hasStringContext = typeof step.context === 'string';
                const isSelected = hasStringContext && selectedContext === step.context;
                const stepHasError = step.hasError === true;

                const nodeKey = `${parentKey}-${i}`;
                const isExpanded = expandedNestedNodes[nodeKey] || false;
                const isErrorExpanded = expandedErrors[nodeKey] || false;

                // Вычисляем отступ слева: фиксированная база + глубина * шаг
                const leftPadding = 8 + depth * 20;

                return (
                    <div key={nodeKey}>
                        <div
                            onClick={() => {
                                if (hasNestedSteps) {
                                    toggleNestedNode(nodeKey);
                                }
                                // Блокируем только клик по SearchIcon (получение данных с бэка)
                                if (hasStringContext && !isExpired) {
                                    onStepClick(step.context as string);
                                }
                                if (stepHasError) {
                                    toggleErrorExpand(nodeKey);
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--ui-kit-spacing-4)',
                                padding: `var(--ui-kit-spacing-1) var(--ui-kit-spacing-2)`,
                                paddingLeft: `${leftPadding}px`,
                                cursor:
                                    hasNestedSteps || stepHasError || (hasStringContext && !isExpired) ? 'pointer' : 'default',
                                fontSize: 11,
                                // eslint-disable-next-line no-nested-ternary
                                background: stepHasError
                                    ? 'var(--ui-kit-colors-alert-error-background)'
                                    : isSelected
                                    ? 'var(--ui-kit-colors-background-highlighted)'
                                    : i % 2 === 0
                                    ? 'var(--ui-kit-colors-background-secondary)'
                                    : 'var(--ui-kit-colors-background-primary)',
                                borderBottom: '1px solid var(--ui-kit-colors-border-primary)',
                                transition: 'background 0.15s',
                            }}
                        >
                            {/* Индикатор раскрытия для вложенных шагов */}
                            <span style={STYLES.expandIcon}>
                                {/* eslint-disable-next-line no-nested-ternary */}
                                {hasNestedSteps ? (
                                    isExpanded ? (
                                        <DropDownIcon size="small" color={stepHasError ? 'error' : 'icon'} />
                                    ) : (
                                        <DropRightIcon size="small" color={stepHasError ? 'error' : 'icon'} />
                                    )
                                ) : null}
                            </span>

                            {/* Время начала */}
                            <span style={STYLES.time}>{fmtTime(step.date)}</span>

                            {/* Смещение от начала */}
                            <span style={STYLES.offset}>+{fmtMs(offsetFromStart)}</span>

                            {/* Timeline бар */}
                            <div
                                style={{
                                    flex: 1,
                                    height: 8,
                                    background: 'var(--ui-kit-colors-background-control)',
                                    borderRadius: 'var(--ui-kit-spacing-1)',
                                    position: 'relative',
                                    minWidth: 50,
                                }}
                            >
                                {stepDuration > 0 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: `${timelineLeft}%`,
                                            width: `${timelineWidth}%`,
                                            height: '100%',
                                            background: stepHasError
                                                ? 'var(--ui-kit-colors-alert-error)'
                                                : isSelected
                                                ? 'var(--ui-kit-colors-basic-primaryHover)'
                                                : 'var(--ui-kit-colors-basic-primary)',
                                            borderRadius: 'var(--ui-kit-spacing-1)',
                                            minWidth: 2,
                                            opacity: i === stepsToRender.length - 1 && !isCompleted ? 0.6 : 1,
                                        }}
                                    />
                                )}
                            </div>

                            {/* Длительность */}
                            <span style={STYLES.duration}>
                                {/* eslint-disable-next-line no-nested-ternary */}
                                {step.duration
                                    ? fmtMs(step.duration)
                                    : i === stepsToRender.length - 1 && !isCompleted
                                    ? '...'
                                    : '—'}
                            </span>

                            {/* Название шага */}
                            <span
                                style={{
                                    flex: 2,
                                    overflow: 'hidden',
                                    minWidth: 100,
                                    color: stepHasError
                                        ? 'var(--ui-kit-colors-alert-error)'
                                        : hasNestedSteps
                                        ? 'var(--ui-kit-colors-basic-primary)'
                                        : 'var(--ui-kit-colors-text-primary)',
                                    fontWeight: stepHasError ? 'bold' : hasNestedSteps ? 'bold' : 'normal',
                                    userSelect: 'text',
                                    fontSize: 11,
                                }}
                            >
                                {step.message}
                            </span>

                            {/* Количество вложенных шагов */}
                            <span style={STYLES.stepsCount}>{hasNestedSteps ? (step.context as IStep[]).length : ''}</span>

                            {/* Иконка поиска — только если не протух */}
                            <span style={STYLES.searchIcon}>
                                {hasStringContext && !isExpired ? <SearchIcon size="small" /> : null}
                            </span>
                        </div>

                        {/* Отображение ошибки в шаге */}
                        {stepHasError && isErrorExpanded && step.error && (
                            <div
                                style={{
                                    margin: 0,
                                    padding: 'var(--ui-kit-spacing-4)',
                                    background: 'var(--ui-kit-colors-alert-error-background)',
                                    paddingLeft: `${leftPadding + 20}px`,
                                }}
                            >
                                <div
                                    style={{
                                        color: 'var(--ui-kit-colors-alert-error)',
                                        fontWeight: 'bold',
                                        marginBottom: 'var(--ui-kit-spacing-2)',
                                        fontSize: 12,
                                    }}
                                >
                                    Ошибка: {step.error.message}
                                </div>
                                {step.error.status && (
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: 'var(--ui-kit-colors-text-secondary)',
                                            marginBottom: 'var(--ui-kit-spacing-1)',
                                        }}
                                    >
                                        Статус: {step.error.status}
                                    </div>
                                )}
                                {step.error.timestamp && (
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: 'var(--ui-kit-colors-text-secondary)',
                                            marginBottom: 'var(--ui-kit-spacing-1)',
                                        }}
                                    >
                                        Время: {new Date(step.error.timestamp).toLocaleString()}
                                    </div>
                                )}
                                {step.error.stack && (
                                    <div style={{ marginTop: 'var(--ui-kit-spacing-2)' }}>
                                        <div
                                            style={{
                                                fontSize: 10,
                                                color: 'var(--ui-kit-colors-text-tertiary)',
                                                marginBottom: 'var(--ui-kit-spacing-1)',
                                            }}
                                        >
                                            Stack trace:
                                        </div>
                                        <pre
                                            style={{
                                                margin: 0,
                                                padding: 'var(--ui-kit-spacing-3)',
                                                background: 'var(--ui-kit-colors-background-primary)',
                                                border: '1px solid var(--ui-kit-colors-border-primary)',
                                                borderRadius: 'var(--ui-kit-spacing-1)',
                                                fontSize: 10,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                color: 'var(--ui-kit-colors-text-primary)',
                                                maxHeight: 200,
                                                overflow: 'auto',
                                            }}
                                        >
                                            {step.error.stack}
                                        </pre>
                                    </div>
                                )}
                                {step.error.errors && step.error.errors.length > 0 && (
                                    <div style={{ marginTop: 'var(--ui-kit-spacing-2)' }}>
                                        <div
                                            style={{
                                                fontSize: 10,
                                                color: 'var(--ui-kit-colors-text-tertiary)',
                                                marginBottom: 'var(--ui-kit-spacing-1)',
                                            }}
                                        >
                                            Дополнительные ошибки:
                                        </div>
                                        {step.error.errors.map((err: any, errIdx: number) => (
                                            <div
                                                key={errIdx}
                                                style={{
                                                    fontSize: 11,
                                                    color: 'var(--ui-kit-colors-text-primary)',
                                                    marginBottom: 'var(--ui-kit-spacing-1)',
                                                }}
                                            >
                                                {err.message}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Метаданные контекста — только если не протух */}
                        {!isExpired && isSelected && hasStringContext && renderStepMeta && (
                            <div
                                style={{
                                    margin: 0,
                                    padding: 'var(--ui-kit-spacing-4)',
                                    background: 'var(--ui-kit-colors-background-primary)',
                                    borderBottom: '1px solid var(--ui-kit-colors-border-primary)',
                                    paddingLeft: `${leftPadding + 20}px`,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        alignItems: 'center',
                                        marginBottom: 'var(--ui-kit-spacing-4)',
                                    }}
                                >
                                    {metaCache[step.context as string]?.data && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            onClick={() => {
                                                const { data } = metaCache[step.context as string];
                                                const meta = data?.meta ?? data;
                                                // eslint-disable-next-line no-nested-ternary
                                                const content = meta?.query
                                                    ? typeof meta.query === 'object'
                                                        ? JSON.stringify(meta.query, null, 2)
                                                        : meta.query
                                                    : JSON.stringify(meta, null, 2);
                                                const formattedContent = content.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                                                handleCopy(formattedContent, step.context as string);
                                            }}
                                        >
                                            {copiedContext === step.context ? 'Скопировано!' : 'Копировать'}
                                        </Button>
                                    )}
                                </div>
                                {renderStepMeta(
                                    step.context as string,
                                    metaCache[step.context as string]?.data,
                                    metaCache[step.context as string]?.loading || false,
                                    metaCache[step.context as string]?.error || null,
                                )}
                            </div>
                        )}

                        {/* Рекурсивно отображаем вложенные шаги */}
                        {hasNestedSteps && isExpanded && renderSteps(step.context as IStep[], depth + 1, nodeKey)}
                    </div>
                );
            }),
        [
            startTime,
            totalDuration,
            isCompleted,
            isExpired,
            selectedContext,
            expandedNestedNodes,
            expandedErrors,
            metaCache,
            copiedContext,
            onStepClick,
            renderStepMeta,
            handleCopy,
            toggleNestedNode,
            toggleErrorExpand,
        ],
    );

    if (!steps.length) {
        return (
            <div
                style={{
                    padding: 'var(--ui-kit-spacing-6)',
                    color: 'var(--ui-kit-colors-text-tertiary)',
                    textAlign: 'center',
                }}
            >
                Нет данных о шагах
            </div>
        );
    }

    return (
        <div style={{ fontSize: 12 }}>
            <div
                style={{
                    display: 'flex',
                    gap: 'var(--ui-kit-spacing-8)',
                    padding: 'var(--ui-kit-spacing-4) var(--ui-kit-spacing-6)',
                    borderRadius: 'var(--ui-kit-spacing-3)',
                    marginBottom: 'var(--ui-kit-spacing-4)',
                    color: hasError ? 'var(--ui-kit-colors-alert-error)' : 'var(--ui-kit-colors-text-primary)',
                }}
            >
                <span>
                    Шагов: <b>{steps.length}</b>
                </span>
                <span>
                    Общее время: <b>{isCompleted ? fmtMs(totalDuration) : 'выполняется...'}</b>
                </span>
                {hasError && <span style={{ fontWeight: 'bold' }}>Завершён с ошибкой</span>}
                {isExpired && (
                    <span style={{ fontWeight: 'bold', color: 'var(--ui-kit-colors-text-disabled)' }}>Данные устарели</span>
                )}
                <span style={{ color: 'var(--ui-kit-colors-text-tertiary)', fontSize: 10 }}>
                    {fmtTime(steps[0].date)} — {isCompleted ? fmtTime(steps[steps.length - 1].date) : '...'}
                </span>
            </div>

            <div
                style={{
                    border: `1px solid var(--ui-kit-colors-border-primary)`,
                    borderRadius: 'var(--ui-kit-spacing-2)',
                    overflow: 'hidden',
                }}
            >
                {renderSteps(steps)}
            </div>
        </div>
    );
};

export default QueryTimeline;
