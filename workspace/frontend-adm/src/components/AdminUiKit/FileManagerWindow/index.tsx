import React, { Component } from 'react';
import { ErrorBoundary } from 'components/ErrorBoundary';
import FileManagerMenu from './FileManagerMenu';
import FileManagerList from './FileManagerList';
import styles from './styles.module.css';

const ROOT_ID = '00000000-0000-0000-0000-000000000000';

export interface FileManagerWindowProps {
    /**
     * Идентификатор корневой директории, которая будет открыта при старте.
     * По умолчанию — системный корень `00000000-0000-0000-0000-000000000000`.
     */
    rootId?: string;
    /**
     * Имя «сервера» для проксирования запросов (например, 'filemanager', 'backend' или '').
     * Передаётся в `FilesList` старого adminpanel; здесь оставлен для совместимости,
     * но напрямую не используется — все запросы идут через `BACKEND_PROXY`.
     */
    server?: string;
    /**
     * Заголовок окна. Если не указан — используется «Файлы».
     */
    title?: string;
}

interface FileManagerWindowState {
    current: string;
    fileOrDirInBuffer: string;
    typeEvent: string;
    reloadData: number;
}

/**
 * Окно управления файлами и директориями.
 *
 * Используется как точка входа из узла «Файлы» дерева метаданных
 * (см. `metadata-files/services/metadata/Files.class.js`).
 * Делает прямые REST-запросы к `/files` (files-cms), аналогично
 * `panel/src/components/FileManager` из старой админки.
 */
export class FileManagerWindow extends Component<FileManagerWindowProps, FileManagerWindowState> {
    constructor(props: FileManagerWindowProps) {
        super(props);

        this.state = {
            current: props.rootId ?? ROOT_ID,
            fileOrDirInBuffer: '',
            typeEvent: '',
            reloadData: Date.now(),
        };
    }

    onChangeDir = (newDir: string): void => {
        this.setState({ current: newDir });
    };

    onReloadData = (): void => {
        this.setState({ reloadData: Date.now() });
    };

    onSendToBuffer = (objectId: string, typeEvent: string, update = false): void => {
        this.setState((prev) => ({
            fileOrDirInBuffer: objectId,
            typeEvent,
            reloadData: update ? Date.now() : prev.reloadData,
        }));
    };

    render(): React.ReactNode {
        return (
            <ErrorBoundary>
                <div className={styles.wrapper}>
                    <div className={styles.menu}>
                        <FileManagerMenu
                            server={this.props.server ?? ''}
                            current={this.state.current}
                            reloadData={this.state.reloadData}
                            onChangeDir={this.onChangeDir}
                        />
                    </div>
                    <div className={styles.content}>
                        <FileManagerList
                            server={this.props.server ?? ''}
                            current={this.state.current}
                            reloadData={this.state.reloadData}
                            onReloadData={this.onReloadData}
                            onChangeDir={this.onChangeDir}
                            onSendToBuffer={this.onSendToBuffer}
                            fileOrDirInBuffer={this.state.fileOrDirInBuffer}
                            typeEvent={this.state.typeEvent}
                        />
                    </div>
                </div>
            </ErrorBoundary>
        );
    }
}

export default FileManagerWindow;
