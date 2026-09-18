import React, { Component, lazy, Suspense } from 'react';
import StateManager from 'lite-react-statemanager';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { createPort } from './createPort';
import type { ProcessHostPort } from './contract';

// 'flowdemoRemote/FlowdemoProcess' — это MF-remote, резолвится в рантайме, а не на этапе сборки.
// eslint-disable-next-line import/no-unresolved
const ProcessApp = lazy(() => import('flowdemoRemote/FlowdemoProcess'));

interface FlowdemoProps {
    /** id записи процесса. Приходит из формы процесса (см. план backend). */
    processId: string;
    /** Префикс сервера. Если не передан — берём из текущего выбора в дереве. */
    server?: string;
}

/**
 * Shell-приложение для frontend-flow: подгружает remote и снабжает его
 * реализацией ProcessHostPort.
 *
 * Единственное место в системе, знающее про обе стороны. Inspector монтирует
 * этот компонент по строке из manifest в БД и про канвас ничего не знает;
 * канвас видит только порт и ничего не знает про инспектор.
 */
export class Flowdemo extends Component<FlowdemoProps> {
    // Порт создаётся один раз на монтирование: новый объект на каждый рендер
    // перезапускал бы загрузку схемы в remote (port входит в deps эффекта).
    private port: ProcessHostPort;

    constructor(props: FlowdemoProps) {
        super(props);
        this.port = createPort(this.resolveServer());
    }

    /**
     * props.server приходит только если у элемента формы задан props.name —
     * FormBuilderMetadata подставляет server именно в этой ветке. У канваса
     * поля формы нет, поэтому запасной источник — текущий выбор в дереве.
     */
    private resolveServer(): string {
        if (this.props.server) return this.props.server;
        const selected = (StateManager.state as Record<string, any>).metadataSelected;
        return selected?.server ?? '';
    }

    render() {
        const { processId } = this.props;

        if (!processId) {
            return <div style={{ padding: 16 }}>Процесс не выбран</div>;
        }

        return (
            <ErrorBoundary fallbackUI={<div style={{ padding: 16 }}>Не удалось загрузить редактор процесса</div>}>
                <Suspense fallback={<div style={{ padding: 16 }}>Загрузка редактора…</div>}>
                    {/* Высоту задаёт хост: у remote внутри height 100%. */}
                    <div style={{ height: '100%', minHeight: 480 }}>
                        <ProcessApp processId={processId} port={this.port} />
                    </div>
                </Suspense>
            </ErrorBoundary>
        );
    }
}

export default Flowdemo;
