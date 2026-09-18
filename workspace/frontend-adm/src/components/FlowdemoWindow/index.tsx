import React, { Component } from 'react';
import StateManager from 'lite-react-statemanager';
import $windows from 'components/WindowsCMP/windows.helper';
import { Flowdemo } from 'components/Flowdemo';

/** Класс записей, у которых есть холст. Приходит с backend (constants.Processes.component). */
const PROCESS_CLASS = 'Processes';

interface SelectedPayload {
    node: { id: string; name: string; description: string; class: string | null };
    server: string;
    nodeKey: string;
}

/**
 * Открывает окно с канвасом при выборе процесса в дереве метаданных.
 *
 * Ничего не рисует: подписывается на тот же ключ metadataSelected, что и
 * InspectorWindow, но под своим именем подписчика. StateManager хранит
 * подписчиков картой по имени, поэтому оба окна открываются от одного клика
 * и не мешают друг другу.
 */
export class FlowdemoWindow extends Component<Record<string, never>> {
    componentDidMount(): void {
        StateManager.subscribeState({
            metadataSelected: { openFlowdemo: this.onSelectedChange },
        });
    }

    componentWillUnmount(): void {
        StateManager.unsubscribeState({ metadataSelected: ['openFlowdemo'] });
    }

    onSelectedChange = ({ metadataSelected }: { metadataSelected?: SelectedPayload }): void => {
        if (!metadataSelected) return;

        const { node, server } = metadataSelected;
        if (!node || node.class !== PROCESS_CLASS) return;

        // uuid на процесс: повторный клик переоткрывает то же окно, а не плодит
        // новые. Без position — плавающее окно Window, см. WindowsList.
        $windows.open(node.description || node.name, <Flowdemo processId={node.id} server={server} />, {
            uuid: `flow:${node.id}`,
            width: '1100px',
            height: '720px',
        });
    };

    render() {
        return (
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    right: 0,
                    zIndex: 99999,
                    background: 'red',
                    color: '#fff',
                    padding: '4px 8px',
                    fontSize: 12,
                }}
            >
                FW
            </div>
        );
    }
}

// Дефолтный экспорт обязателен: ModuleFederationCMP рендерит именно его.
// Так же устроен InspectorWindow/index.tsx.
export default FlowdemoWindow;
