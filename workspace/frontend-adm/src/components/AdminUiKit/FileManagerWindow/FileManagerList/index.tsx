import React, { Component, createRef } from 'react';
import StateManager from 'lite-react-statemanager';
import { Dropdown } from 'ui-kit';
import $api from 'helpers/axios';
import { ApiError } from 'components/ApiError';
import MyButton from 'components/ui/MyButton/MyButton';
import MyIcon from 'components/ui/MyIcon/MyIcon';
import $message from 'components/ui/MyFlash/message.helper';
import $modal from 'components/ui/MyModal/modal.helper';
import { uploadFile } from 'helpers/uploadFile';
import { BACKEND_PROXY } from 'settings/settings';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { buildUrl } from 'helpers/buildUrl';
import styles from './styles.module.css';

export interface FileItem {
    id: string;
    name: string;
    ext: string;
    type: 'directory' | 'file';
    mode: number;
    parent: string;
    size: number;
    atime: string;
    mtime: string;
    md5?: string;
    markdel?: number;
}

export interface FileListResponse {
    id: string;
    parent: string;
    name: string;
    fullname: string;
    children: FileItem[];
}

export interface FileManagerListProps {
    current: string;
    reloadData: number;
    onReloadData: () => void;
    onChangeDir: (id: string) => void;
    onSendToBuffer: (id: string, typeEvent: string, update?: boolean) => void;
    fileOrDirInBuffer: string;
    typeEvent: string;
    server?: string;
}

interface FileManagerListState {
    error: unknown;
    isLoaded: boolean;
    content: FileListResponse;
    idRow: string;
}

const ROOT_ID = '00000000-0000-0000-0000-000000000000';

export class FileManagerList extends Component<FileManagerListProps, FileManagerListState> {
    private subName = `fileManagerList:${Math.random().toString(36).slice(2)}`;

    private fileInputRef = createRef<HTMLInputElement>();

    constructor(props: FileManagerListProps) {
        super(props);

        this.state = {
            error: undefined,
            isLoaded: false,
            content: {
                id: ROOT_ID,
                parent: ROOT_ID,
                name: '',
                fullname: '',
                children: [],
            },
            idRow: '',
        };
    }

    componentDidMount(): void {
        this.loadData();
        StateManager.subscribeState({
            fileUpdate: { [this.subName]: this.handleFileUpdate },
        });
    }

    componentDidUpdate(prevProps: FileManagerListProps): void {
        if (prevProps.current !== this.props.current || prevProps.reloadData !== this.props.reloadData) {
            this.loadData();
        }
    }

    componentWillUnmount(): void {
        StateManager.unsubscribeState({
            fileUpdate: [this.subName],
        });
    }

    // -------------------------------- lifecycle helpers --------------------------------

    handleFileUpdate = (): void => {
        this.loadData();
    };

    loadData = (): void => {
        const { server } = this.props;
        const current = this.props.current || ROOT_ID;
        const query = new URLSearchParams();
        query.append('parent', current);
        query.append('filter', JSON.stringify({ where: { markdel: 0 } }));

        const path = `/files?${query.toString()}#${this.props.reloadData}`;
        const url = buildUrl(server, path);
        $api.get(url)
            .then(({ data }: { data: FileListResponse | FileItem[] }) => {
                const isArrayResponse = Array.isArray(data);
                const children: FileItem[] = isArrayResponse
                    ? (data as unknown as FileItem[])
                    : (data as FileListResponse).children ?? [];
                const root: FileListResponse = isArrayResponse
                    ? {
                          id: current,
                          parent: ROOT_ID,
                          name: '',
                          fullname: '',
                          children: data as FileItem[],
                      }
                    : (data as FileListResponse);

                this.setState({
                    isLoaded: true,
                    error: undefined,
                    content: {
                        id: root.id ?? current,
                        parent: root.parent ?? ROOT_ID,
                        name: root.name ?? '',
                        fullname: root.fullname ?? '',
                        children,
                    },
                });
            })
            .catch((e: unknown) => {
                this.setState({ isLoaded: true, error: e });
            });
    };

    // -------------------------------- actions --------------------------------

    confirmAction = (text: string): Promise<boolean> =>
        new Promise((resolve) => {
            $modal.show(
                'Подтверждение',
                <div className={styles.confirmDialog}>
                    <MyButton style={{ width: 80 }} onClick={() => this.closeConfirm(true, resolve)}>
                        Да
                    </MyButton>
                    <MyButton style={{ width: 80 }} onClick={() => this.closeConfirm(false, resolve)}>
                        Нет
                    </MyButton>
                </div>,
            );
        });

    private closeConfirm = (value: boolean, resolve: (v: boolean) => void): void => {
        $modal.hide();
        resolve(value);
    };

    onDeleteClick = async (fileId: string): Promise<void> => {
        const item = this.state.content.children.find((c: FileItem) => c.id === fileId);
        if (!item) return;

        const label = item.type === 'directory' || item.mode === 1 ? 'папку' : 'файл';
        const ok = await this.confirmAction(`Удалить ${label}:\n${item.name}`);
        if (!ok) return;

        const server = this.props.server ?? '';
        const url = buildUrl(server, `/files/${fileId}`);
        $api.delete(url)
            .then(() => {
                if (this.props.onReloadData) this.props.onReloadData();
            })
            .catch((e: unknown) => {
                const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
                $message.show(message || 'Ошибка удаления');
            });
    };

    onCopyClick = (fileId: string): void => {
        this.props.onSendToBuffer(fileId, 'COPY');
        $message.show('Файл или директория скопированы в буфер');
    };

    onCutClick = (fileId: string): void => {
        this.props.onSendToBuffer(fileId, 'MOVE');
        $message.show('Файл или директория скопированы в буфер');
    };

    onCopyIdClick = (fileId: string): void => {
        if (navigator?.clipboard) {
            navigator.clipboard
                .writeText(fileId)
                .then(() => $message.show('Id скопирован в буфер'))
                .catch(() => $message.show('Не удалось скопировать id'));
        }
    };

    onCopyLink = (item: FileItem): void => {
        const host = typeof window !== 'undefined' ? window.location.origin : '';
        const link = `${host}${BACKEND_PROXY}/files/public/download/${item.id}/${encodeURIComponent(item.name)}${
            item.ext ?? ''
        }`;
        if (navigator?.clipboard) {
            navigator.clipboard
                .writeText(link)
                .then(() => $message.show('Ссылка на файл скопирована в буфер'))
                .catch(() => $message.show('Не удалось скопировать ссылку'));
        }
    };

    onDownload = (item: FileItem): void => {
        const url = `${BACKEND_PROXY}/files/download/${item.id}/${item.name}${item.ext ?? ''}`;
        window.open(url, '_blank');
    };

    onAccessClick = (nodeId: string): void => {
        StateManager.setState({
            nodeAccess: {
                nodeId,
                server: this.props.server ?? '',
                tableName: 'files'
            },
        });
    };

    onClickBack = (): void => {
        if (this.state.content.parent && this.state.content.parent !== this.state.content.id) {
            this.props.onChangeDir(this.state.content.parent);
        }
    };

    onClickAddDir = (): void => {
        $modal.show(
            'Создать директорию',
            <form
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const name = (form.elements.namedItem('newFolderName') as HTMLInputElement)?.value ?? '';
                    this.createFolder(name);
                }}
            >
                <input
                    className={styles.modalInput}
                    name="newFolderName"
                    id="newFolderName"
                    placeholder="Имя директории"
                />
                <MyButton type="submit">Создать</MyButton>
            </form>,
        );
    };

    createFolder = (name: string): void => {
        if (!name) return;

        const formData = new FormData();
        formData.append('parent', this.props.current);
        formData.append('name', name);

        const server = this.props.server ?? '';
        const url = buildUrl(server, '/files');

        $api.post(url, formData, {
            headers: { 'Content-type': 'multipart/form-data' },
        })
            .then(() => {
                $modal.hide();
                if (this.props.onReloadData) this.props.onReloadData();
            })
            .catch((e: unknown) => {
                const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
                $message.show(message || 'Ошибка создания директории');
            });
    };

    onClickEdit = (fileId: string, currentName: string): void => {
        $modal.show(
            'Переименовать',
            <form
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const name = (form.elements.namedItem('newName') as HTMLInputElement)?.value ?? '';
                    this.renameItem(fileId, name);
                }}
            >
                <input
                    className={styles.modalInput}
                    name="newName"
                    id="newName"
                    defaultValue={currentName}
                />
                <MyButton type="submit">Сохранить</MyButton>
            </form>,
        );
    };

    renameItem = (id: string, name: string): void => {
        if (!name) return;
        const server = this.props.server ?? '';
        const url = buildUrl(server, `/files/${id}`);
        $api.put(url, { name })
            .then(() => {
                $modal.hide();
                if (this.props.onReloadData) this.props.onReloadData();
            })
            .catch((e: unknown) => {
                const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
                $message.show(message || 'Ошибка переименования');
            });
    };

    onPutFile = (): void => {
        const id = this.props.fileOrDirInBuffer;
        if (!id) return;

        const parent = this.props.current;
        const method = (this.props.typeEvent || '').toLowerCase();

        const query = new URLSearchParams();
        query.append('copy', method === 'copy' ? 'true' : 'false');

        const server = this.props.server ?? '';
        const url = buildUrl(server, `/files/${id}?${query.toString()}`);

        $api.put(url, { parent })
            .then(() => {
                this.props.onSendToBuffer('', '', true);
            })
            .catch((e: unknown) => {
                const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
                $message.show(message || 'Ошибка вставки');
            });
    };

    onSelect = (id: string, hasChildren: number | string): void => {
        const isDirectory = hasChildren === 1 || hasChildren === '1';
        if (isDirectory) {
            this.props.onChangeDir(id);
        }
    };

    onUploadClick = (): void => {
        this.fileInputRef.current?.click();
    };

    onFilesSelected = async (ev: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const files = ev.target.files ? Array.from(ev.target.files) : [];
        if (files.length === 0) return;

        $modal.show('Загрузка файлов', <div>0%</div>);

        let count = 0;
        const params = new URLSearchParams([['recursive', 'true']]);

        const server = this.props.server ?? '';
        const filesUrl = buildUrl(server, '/files');

        const promises = files.map(
            (file) =>
                new Promise<void>((resolve, reject) => {
                    uploadFile('post', filesUrl, { parent: this.props.current, name: file.name }, file)
                        .then(() => {
                            count++;
                            const percent = files.length === count ? 100 : Math.round((count / files.length) * 100);
                            $modal.show('Загрузка файлов', <div>{percent}%</div>);
                            resolve();
                        })
                        .catch((err: unknown) => {
                            $modal.hide();
                            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                            $message.show(message || 'Ошибка загрузки файла');
                            reject(err);
                        });
                }),
        );

        try {
            await Promise.all(promises);
        } catch {
            // errors already shown via $message
        }

        ev.target.value = '';
        $modal.hide();
        if (this.props.onReloadData) this.props.onReloadData();
    };

    // -------------------------------- build dropdown menu for file row --------------------------------

    buildFileDropdown = (item: FileItem): React.ReactNode => {
        const isDirectory = item.type === 'directory' || item.mode === 1;

        const options: Array<{
            label: string;
            onClick: () => void;
            disabled?: boolean;
        }> = [
            {
                label: 'Переименовать',
                onClick: () => this.onClickEdit(item.id, item.name),
            },
            !isDirectory
                ? {
                      label: 'Скачать',
                      onClick: () => this.onDownload(item),
                  }
                : null,
            {
                label: 'Скопировать',
                onClick: () => this.onCopyClick(item.id),
            },
            {
                label: 'Скопировать id',
                onClick: () => this.onCopyIdClick(item.id),
            },
            {
                label: 'Скопировать ссылку',
                onClick: () => this.onCopyLink(item),
            },
            {
                label: 'Вырезать',
                onClick: () => this.onCutClick(item.id),
            },
            {
                label: 'Доступ',
                onClick: () => this.onAccessClick(item.id),
            },
            {
                label: 'Удалить',
                onClick: () => this.onDeleteClick(item.id),
            },
        ].filter((opt): opt is NonNullable<typeof opt> => opt !== null);

        return (
            <Dropdown
                variant="outlined"
                size="small"
                color="controlled"
                options={options}
                style={{ marginLeft: '8px' }}
                onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            />
        );
    };

    // -------------------------------- render --------------------------------

    buildToolbar(): React.ReactNode {
        return (
            <div className={styles.toolbar}>
                <div className={styles.buttons}>
                    <button
                        type="button"
                        className={styles.toolbarBtn}
                        onClick={this.onClickBack}
                        title="На уровень вверх"
                    >
                        <i className="bi bi-arrow-left" />
                    </button>
                    <button
                        type="button"
                        className={styles.toolbarBtn}
                        onClick={this.onUploadClick}
                        title="Загрузить файл"
                    >
                        <i className="bi bi-plus-circle" />
                    </button>
                    <button
                        type="button"
                        className={styles.toolbarBtn}
                        onClick={this.onPutFile}
                        title="Вставить скопированный файл"
                        disabled={!this.props.fileOrDirInBuffer}
                    >
                        <i className="bi bi-clipboard-plus" />
                    </button>
                    <button
                        type="button"
                        className={styles.toolbarBtn}
                        onClick={this.onClickAddDir}
                        title="Создать папку"
                    >
                        <i className="bi bi-folder-plus" />
                    </button>
                </div>
                <form style={{ display: 'none' }}>
                    <input ref={this.fileInputRef} type="file" multiple onChange={this.onFilesSelected} />
                </form>
            </div>
        );
    }

    buildRow = (item: FileItem): React.ReactNode => {
        const isDirectory = item.type === 'directory' || item.mode === 1;
        const sizeKb = Math.round((item.size ?? 0) / 1024);
        const date = item.atime ? new Date(item.atime) : null;

        const onRowClick = (): void => {
            if (isDirectory) this.props.onChangeDir(item.id);
        };

        return (
            <div
                key={item.id}
                className={styles.row}
                style={{ cursor: isDirectory ? 'pointer' : 'default' }}
                onClick={onRowClick}
            >
                <div className={styles.rowName}>
                    <MyIcon size={20} icon={isDirectory ? 'bi-folder' : 'bi-file-earmark'} />
                    <span
                        style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: 0,
                            flex: 1,
                        }}
                    >
                        {item.name}
                        {item.ext}
                    </span>
                </div>
                <div className={styles.rowSize}>{sizeKb}Kb</div>
                <div className={styles.rowDate}>{date ? date.toLocaleString() : ''}</div>
                <div className={styles.rowActions}>{this.buildFileDropdown(item)}</div>
            </div>
        );
    };

    render(): React.ReactNode {
        if (this.state.error) {
            return (
                <div className={styles.errorBlock}>
                    <ApiError {...(this.state.error as Record<string, unknown>)} />
                </div>
            );
        }
        if (!this.state.isLoaded) {
            return <div className={styles.loadingBlock}>Загрузка...</div>;
        }

        const { children, fullname } = this.state.content;

        return (
            <ErrorBoundary>
                <h4 className={styles.headerTitle}>Файловый менеджер</h4>
                <div
                    className={styles.fullnameBlock}
                    title={fullname}
                >
                    {fullname}
                </div>
                {this.buildToolbar()}
                {children.length === 0 ? (
                    <div className={styles.emptyBlock}>Директория пуста</div>
                ) : (
                    children.map((item: FileItem) => this.buildRow(item))
                )}
            </ErrorBoundary>
        );
    }
}

export default FileManagerList;
