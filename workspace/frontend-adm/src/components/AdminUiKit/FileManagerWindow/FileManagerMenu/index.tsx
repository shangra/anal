import React, { Component, createRef } from 'react';
import StateManager from 'lite-react-statemanager';
import $api from 'helpers/axios';
import { ApiError } from 'components/ApiError';
import MyIcon from 'components/ui/MyIcon/MyIcon';
import { ErrorBoundary } from 'components/ErrorBoundary';
import type { FileListResponse, FileItem } from '../FileManagerList';
import { buildUrl } from 'helpers/buildUrl';
import styles from './styles.module.css';

interface FileManagerMenuProps {
    current: string;
    onChangeDir: (id: string) => void;
    reloadData: number;
    server: string;
}

interface FileManagerMenuState {
    error: unknown;
    item: {
        id: string;
        name: string;
        fullname: string;
        parent: string;
        children: FileListResponse['children'];
    };
    searchValue: string;
    searchedItems: React.ReactNode[] | null;
    isSearching: boolean;
}

const ROOT_ID = '00000000-0000-0000-0000-000000000000';
const DEBOUNCE_MS = 600;

export class FileManagerMenu extends Component<FileManagerMenuProps, FileManagerMenuState> {
    private subName = `fileManagerMenu:${Math.random().toString(36).slice(2)}`;

    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    private searchRequestId = 0;

    private searchInputRef = createRef<HTMLInputElement>();

    constructor(props: FileManagerMenuProps) {
        super(props);

        this.state = {
            error: undefined,
            item: {
                id: ROOT_ID,
                name: '',
                fullname: '',
                parent: ROOT_ID,
                children: [],
            },
            searchValue: '',
            searchedItems: null,
            isSearching: false,
        };
    }

    componentDidMount(): void {
        this.getItemData();
        StateManager.subscribeState({
            fileUpdate: { [this.subName]: this.handleFileUpdate },
        });
    }

    componentDidUpdate(prevProps: FileManagerMenuProps): void {
        if (prevProps.current !== this.props.current || prevProps.reloadData !== this.props.reloadData) {
            this.getItemData();
            // сброс поиска при смене директории
            this.resetSearch();
        }
    }

    componentWillUnmount(): void {
        StateManager.unsubscribeState({
            fileUpdate: [this.subName],
        });
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }

    // -------------------------------- handlers --------------------------------

    handleFileUpdate = (): void => {
        this.getItemData();
    };

    getItemData = (): void => {
        const { server } = this.props;
        const current = this.props.current || ROOT_ID;
        const query = new URLSearchParams();
        query.append('parent', current);
        query.append('mode', '1');

        const path = `/files?${query.toString()}#${this.props.reloadData}`;
        const url = buildUrl(server, path);
        $api.get(url)
            .then(({ data }: { data: FileListResponse | FileListResponse['children'] }) => {
                let children: FileItem[];
                let item: { id: string; name: string; fullname: string; parent: string };

                if (Array.isArray(data)) {
                    children = data;
                    item = {
                        id: current,
                        name: '',
                        fullname: '',
                        parent: ROOT_ID,
                    };
                } else {
                    const obj = data as FileListResponse;
                    children = (obj.children ?? []) as FileItem[];
                    item = {
                        id: obj.id ?? current,
                        name: obj.name ?? '',
                        fullname: obj.fullname ?? '',
                        parent: obj.parent ?? ROOT_ID,
                    };
                }

                this.setState({
                    item: {
                        ...item,
                        children,
                    },
                });
            })
            .catch((e: unknown) => {
                this.setState({ error: e });
            });
    };

    // -------------------------------- search --------------------------------

    resetSearch = (): void => {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.setState({ searchValue: '', searchedItems: null, isSearching: false });
    };

    onSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { value } = e.target;
        this.setState({ searchValue: value });

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        if (!value.trim()) {
            this.setState({ searchedItems: null, isSearching: false });
            return;
        }

        this.setState({ isSearching: true });
        this.debounceTimer = setTimeout(() => {
            this.getAllItems(value);
        }, DEBOUNCE_MS);
    };

    onSearchClear = (): void => {
        this.resetSearch();
        this.searchInputRef.current?.focus();
    };

    getAllItems = (searchValue: string): void => {
        const { server } = this.props;
        const requestId = ++this.searchRequestId;

        // payload соответствует легаси FilesMenu.js — markdel передается строкой '0'
        const filter = {
            where: {
                markdel: '0',
                search: searchValue,
            },
        };

        const query = new URLSearchParams();
        query.append('filter', JSON.stringify(filter));

        const path = `/files?${query.toString()}`;
        const url = buildUrl(server, path);

        $api.get(url)
            .then(({ data }: { data: FileItem[] }) => {
                // игнорируем устаревшие ответы
                if (requestId !== this.searchRequestId) return;

                const items = Array.isArray(data) ? data : [];
                const sorted = [...items].sort((a, b) => {
                    const aIsDir = a.type === 'directory' || a.mode === 1;
                    const bIsDir = b.type === 'directory' || b.mode === 1;
                    if (aIsDir === bIsDir) return 0;
                    return aIsDir ? -1 : 1;
                });

                const searchedItems = sorted.map(({ id, name, type, parent }) => {
                    const info = name === '' ? 'root' : name;
                    const isDirectory = type === 'directory';
                    const icon = isDirectory ? 'bi-folder' : 'bi-file-earmark';
                    return (
                        <div
                            key={id}
                            className={styles.searchResult}
                            title={info}
                            onClick={() => this.onSelectSearchResult(id, isDirectory, parent)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    this.onSelectSearchResult(id, isDirectory, parent);
                                }
                            }}
                        >
                            <MyIcon size={14} className={styles.iconWithMargin} icon={icon} />
                            <span className={styles.searchResultText}>{info}</span>
                        </div>
                    );
                });

                this.setState({ searchedItems, isSearching: false });
            })
            .catch(() => {
                if (requestId !== this.searchRequestId) return;
                this.setState({ searchedItems: [], isSearching: false });
            });
    };

    onSelectSearchResult = (id: string, isDirectory: boolean, parent: string): void => {
        const targetId = isDirectory ? id : parent;
        if (!targetId) return;
        this.props.onChangeDir(targetId);
        this.resetSearch();
    };

    onSelectDir = (id: string): void => {
        this.props.onChangeDir(id);
    };

    // -------------------------------- render helpers --------------------------------

    renderSearchResults = (
        searchedItems: React.ReactNode[] | null,
        isSearching: boolean,
    ): React.ReactNode => {
        if (isSearching) {
            return (
                <div className={styles.searchResults}>
                    <div className={styles.searchingText}>Поиск...</div>
                </div>
            );
        }

        if (searchedItems && searchedItems.length > 0) {
            return (
                <div className={styles.searchResults}>
                    {searchedItems}
                    {searchedItems.length > 9 && (
                        <div className={styles.tooMany}>Слишком много результатов поиска</div>
                    )}
                </div>
            );
        }

        return (
            <div className={styles.searchResults}>
                <div className={styles.searchingText}>Поиск не дал результатов</div>
            </div>
        );
    };

    renderTree = (items: React.ReactNode[]): React.ReactNode => {
        if (items.length === 0) {
            return <div className={styles.noChildrenText}>Нет вложенных директорий</div>;
        }
        return items;
    };

    // -------------------------------- render --------------------------------

    render(): React.ReactNode {
        if (this.state.error) {
            return <ApiError {...(this.state.error as Record<string, unknown>)} />;
        }

        const { children } = this.state.item;
        const { searchValue, searchedItems, isSearching } = this.state;
        const isSearchingActive = searchValue.trim().length > 0;

        const items = children.map((item: FileItem) => {
            const isDirectory = item.type === 'directory' || item.mode === 1;
            const icon = isDirectory ? 'bi-folder' : 'bi-file-earmark';
            const isDeleted = item.markdel === 1;
            return (
                <div
                    key={item.id}
                    className={`${styles.treeElem} ${isDeleted ? styles.deletedItem : ''}`}
                    onClick={() => this.onSelectDir(item.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.onSelectDir(item.id);
                        }
                    }}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title={item.name}
                >
                    <MyIcon size={14} className={styles.iconWithMargin} icon={icon} />
                    <span
                        style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 220,
                        }}
                    >
                        {item.name || item.id}
                    </span>
                </div>
            );
        });

        return (
            <ErrorBoundary>
                <div className={styles.container}>
                    <div className={styles.searchWrapper}>
                        <MyIcon size={14} className={styles.searchIcon} icon="bi-search" />
                        <input
                            ref={this.searchInputRef}
                            type="text"
                            className={styles.searchInput}
                            placeholder="Поиск..."
                            value={searchValue}
                            onChange={this.onSearchChange}
                        />
                        {searchValue && (
                            <MyIcon
                                size={14}
                                className={styles.searchClear}
                                icon="bi-x"
                                onClick={this.onSearchClear}
                            />
                        )}
                    </div>

                    {isSearchingActive && this.renderSearchResults(searchedItems, isSearching)}
                    {!isSearchingActive && this.renderTree(items)}
                </div>
            </ErrorBoundary>
        );
    }
}

export default FileManagerMenu;
