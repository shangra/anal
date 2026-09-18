import { IButton, ICellPluginsConfig, ICellStyles, ICellWithStyles } from '../../../AdapterSpreadSheet/types';
import { LoaderIcon } from '../../NewPluginPivot/services/PivotTableService/icons';
import { MinusIcon, PlusIcon, TableCollapsedIcon, TableExpandedIcon } from '../icons';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BuildToggleButtonParams {
    isLoading: boolean;
    isExpanded: boolean;
    disabled: boolean;
    iconCollapsed: string;
    iconExpanded: string;
    iconLoading: string;
    onClickCollapse: (event?: any) => void;
    onClickExpand: (event?: any) => void;
}

export interface ChunkStates {
    isLoadingHierarchy: boolean;
    isChunkExpandedHierarchy: boolean;
    isLoadingOpen: boolean;
    isChunkExpandedOpen: boolean;
    isChunkEmptyHierarchy: boolean;
    isChunkEmptyOpen: boolean;
    /** true, если загружается другой чанк — кнопка "+" переводится в disabled */
    isDisabledHierarchy?: boolean;
    isDisabledOpen?: boolean;
}

export interface BuildMainCellMeta {
    open: boolean;
    hierarchy: boolean;
    level: number;
    handleLoad: {
        hierarchy: (event?: any) => Promise<void>;
        open: (event?: any) => Promise<void>;
    };
    handleRemove: {
        hierarchy: (event?: any) => Promise<void>;
        open: (event?: any) => Promise<void>;
    };
}

export interface BuildMainCellParams {
    cellData: any;
    styles?: ICellStyles;
    pluginsConfig?: ICellPluginsConfig;
    chunkStates: ChunkStates;
    meta: BuildMainCellMeta;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Создаёт конфиг кнопки-переключателя с опциональной анимацией вращения.
 */
export function buildToggleButton(params: BuildToggleButtonParams): IButton {
    const { isLoading, isExpanded, disabled, iconCollapsed, iconExpanded, iconLoading, onClickCollapse, onClickExpand } =
        params;

    let icon: string;
    let handleClick: ((event?: any) => void) | undefined;
    if (isLoading) {
        icon = iconLoading;
    } else if (isExpanded) {
        icon = iconExpanded;
        handleClick = onClickCollapse;
    } else {
        icon = iconCollapsed;
        handleClick = onClickExpand;
    }

    const button: IButton = {
        positionRelativeToText: 'before',
        type: 'button',
        disabled,
        loading: isLoading,
        icon,
        onClick: handleClick,
        ...(isLoading && {
            animation: {
                keyframes: [
                    { offset: 0, rotation: 0, easing: 'linear' },
                    { offset: 1, rotation: 360, easing: 'linear' },
                ] as any,
                options: {
                    duration: 500,
                    easing: 'linear',
                    iterations: Infinity,
                } as any,
            },
        }),
    };

    return button;
}

/**
 * Собирает ICellWithStyles с кнопками open/hierarchy.
 * Используется как единая фабрика для getComputedMainCell в Index и Column.
 */
export function buildMainCell(params: BuildMainCellParams): ICellWithStyles {
    const { cellData, styles, pluginsConfig, chunkStates, meta } = params;

    const cell: ICellWithStyles = {
        components: [],
        data: cellData,
        ...(styles ? { styles } : {}),
        ...(pluginsConfig ? { pluginsConfig } : {}),
    };

    // Добавление бургера (open)
    if (cellData && meta.open) {
        const openButton = buildToggleButton({
            isLoading: chunkStates.isLoadingOpen,
            isExpanded: chunkStates.isChunkExpandedOpen,
            disabled: chunkStates.isLoadingOpen || (chunkStates.isDisabledOpen ?? false),
            iconCollapsed: TableCollapsedIcon,
            iconExpanded: TableExpandedIcon,
            iconLoading: LoaderIcon,
            onClickCollapse: meta.handleRemove.open,
            onClickExpand: meta.handleLoad.open,
        });

        cell.components?.push(openButton);
    }

    // Добавление иконки раскрытия иерархии (hierarchy)
    if (cellData && meta.hierarchy) {
        const hierarchyButton = buildToggleButton({
            isLoading: chunkStates.isLoadingHierarchy,
            isExpanded: chunkStates.isChunkExpandedHierarchy,
            disabled: chunkStates.isLoadingHierarchy || (chunkStates.isDisabledHierarchy ?? false),
            iconCollapsed: PlusIcon,
            iconExpanded: MinusIcon,
            iconLoading: LoaderIcon,
            onClickCollapse: meta.handleRemove.hierarchy,
            onClickExpand: meta.handleLoad.hierarchy,
        });

        cell.components?.push(hierarchyButton);
    }

    return cell;
}
