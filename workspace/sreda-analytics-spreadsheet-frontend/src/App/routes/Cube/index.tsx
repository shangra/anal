import React, { createRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Theme } from 'ui-kit';

import AdapterSpreadSheet from '../../../components/AdapterSpreadSheet';
import {
    // NewPluginPivot,
    PluginCellEdit,
    PluginCellFormatting,
    PluginCellStyling,
    // PluginChartGeneration,
    PluginContextMenu,
    PluginCursorCell,
    PluginFetchError,
    PluginFill,
    PluginFormulas,
    PluginFrozenPanes,
    PluginFullscreen,
    PluginGroups,
    PluginHistory,
    PluginJoinedCells,
    PluginMetadata,
    PluginPages,
    PluginPersist,
    PluginPivot,
    PluginProfileQuery,
    PluginQuickCalculation,
    PluginZoom,
} from '../../../components/SpreadSheetPlugins';
import { PluginChartGeneration } from '../../../components/SpreadSheetPlugins/PluginChartGeneration';
import { PLUGIN_PIVOT_KEY } from '../../../components/SpreadSheetPlugins/PluginPivot/constants';
import { PluginPivotArg, PluginPivotArgs } from '../../../components/SpreadSheetPlugins/PluginPivot/types';
import { CanvasTableAdapter } from '../../../components/TableAdapters/CanvasTableAdapter';
import { Accordion } from '../../../components/UIKit/Accordion';
import { Button } from '../../../components/UIKit/Button';
import { Icon } from '../../../components/UIKit/Icon';
import { IconButton } from '../../../components/UIKit/IconButton';
import { PopConfirm } from '../../../components/UIKit/PopConfirm';
import $api from '../../../helpers/axios';
import { CubeSelect, adminPanelUrl } from '../CubeSelect';

interface IAppState {
    cubeId: string;
    description: string;
    server: string;
    isLoadingUpdate: boolean;
    isLoadingResetCache: boolean;
    theme?: Theme;
}

class Cube extends React.Component<any, IAppState> {
    containerRef: React.RefObject<HTMLDivElement>;

    AdapterSpreadSheetRef: React.RefObject<AdapterSpreadSheet>;

    constructor(props: any) {
        super(props);

        this.containerRef = createRef();
        this.AdapterSpreadSheetRef = createRef();

        const { search } = window.location;
        const queryParams = new URLSearchParams(search);

        const cubeId = queryParams.get('cubeId') ?? '';
        const description = queryParams.get('description') ?? '';
        const server = (queryParams.get('server') ?? '').replace(/\/+$/gm, '');

        this.state = {
            cubeId,
            description,
            server,
            isLoadingUpdate: false,
            isLoadingResetCache: false,
        };
    }

    UpdateIcon(props: any) {
        return (
            <Icon
                viewBox="0 0 24 24"
                className={props?.className}
                width={props?.width}
                height={props?.height}
                style={props?.style}
                size={props?.size}
            >
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </Icon>
        );
    }

    ArrowRepeatIcon(props: any) {
        return (
            <Icon
                viewBox="0 0 15 15"
                className={props?.className}
                width={props?.width}
                height={props?.height}
                style={props?.style}
                size={props?.size}
            >
                <path
                    fillRule="evenodd"
                    d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"
                />
                <path
                    fillRule="evenodd"
                    d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"
                />
            </Icon>
        );
    }

    async handleUpdate() {
        this.setState({ isLoadingUpdate: true });

        // @ts-ignore
        return this.AdapterSpreadSheetRef.current?.plugins?.NewPluginPivot?.instance?.updateData?.update().finally(() => {
            this.setState({ isLoadingUpdate: false });
        });
    }

    async handleResetCache(): Promise<any> {
        const requiredFields = ['columns', 'layers', 'rows', 'values'];
        const args = this.AdapterSpreadSheetRef.current?.getPluginState(PLUGIN_PIVOT_KEY)?.args;
        if (!args) return;

        const isEmptySchemaSettings = Object.keys(args).some((key) => {
            const arg = args[key as keyof PluginPivotArgs] as PluginPivotArg[];
            if (requiredFields.includes(key)) {
                return !!arg.length;
            }
            return false;
        });

        if (this.state.isLoadingResetCache || !isEmptySchemaSettings) return;

        this.setState({ isLoadingResetCache: true });

        $api.delete(
            `${this.state.server ? `/to/${this.state.server}` : '/'}metadata/cachedmetadata/${this.state.cubeId}/body`,
            { data: args },
        ).finally(() => {
            this.setState({ isLoadingResetCache: false });
        });
    }

    render() {
        const { theme } = this.props;
        if (!this.state.cubeId) {
            return <CubeSelect />;
        }
        return (
            <div
                ref={this.containerRef}
                className="DesktopContainer"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1rem',
                    gap: 'var(--ui-kit-spacing-6)',
                }}
            >
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
                    <Link to="/">Все кубы</Link>
                    <a href={adminPanelUrl()}>Админка</a>
                </div>
                <Accordion
                    items={[
                        {
                            title: this.state.description,
                            defaultOpened: true,
                            content: (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--ui-kit-button-gap)',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                flexWrap: 'nowrap',
                                                alignContent: 'flex-start',
                                                alignItems: 'flex-start',
                                                gap: 'var(--ui-kit-button-gap)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <div id="RootPluginHistory" />
                                            <div id="RootPluginPersist" />
                                        </div>
                                        <div id="RootPluginCellStyling" />
                                        <div
                                            id="RootPluginCellFormatting"
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                flexWrap: 'nowrap',
                                                alignContent: 'flex-start',
                                                alignItems: 'flex-start',
                                                gap: 'var(--ui-kit-button-gap)',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                flexWrap: 'nowrap',
                                                alignContent: 'flex-start',
                                                alignItems: 'flex-start',
                                                gap: 'var(--ui-kit-button-gap)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <div id="RootPluginJoinedCells" />
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    flexWrap: 'nowrap',
                                                    alignContent: 'flex-start',
                                                    alignItems: 'flex-start',
                                                    gap: 'var(--ui-kit-button-gap)',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <div id="RootPluginChartGeneration" />
                                                <div id="RootPluginProfileQuery" />
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                flexWrap: 'nowrap',
                                                alignContent: 'flex-start',
                                                alignItems: 'flex-start',
                                                gap: 'var(--ui-kit-button-gap)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <div id="RootPluginCleanTable" />
                                            <div>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'flex-start',
                                                        gap: 8,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <PopConfirm
                                                        title="Очистка кэша запроса"
                                                        content="Вы действительно хотите очистить кэш запроса?"
                                                        rejectLabel="Нет"
                                                        confirmLabel="Да"
                                                        placement="bottom"
                                                        closeOnOutsideClick
                                                        onConfirm={this.handleResetCache}
                                                    >
                                                        <Button
                                                            variant="text"
                                                            color="error"
                                                            style={{ display: 'flex' }}
                                                            leftIcon={this.ArrowRepeatIcon}
                                                            disabled={this.state.isLoadingResetCache}
                                                            loading={this.state.isLoadingResetCache}
                                                        >
                                                            Очистить кэш
                                                        </Button>
                                                    </PopConfirm>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ),
                        },
                    ]}
                />

                <div
                    style={{
                        position: 'relative',
                        flexBasis: 0,
                        flexGrow: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        display: 'flex',
                        gap: 'var(--ui-kit-button-gap)',
                        flexDirection: 'column',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            gap: 'var(--ui-kit-spacing-4)',
                            alignItems: 'center',
                        }}
                    >
                        <div id="RootPluginCursorCell" />
                        <div
                            id="RootPluginCellEdit"
                            style={{
                                flexBasis: 0,
                                flexGrow: 1,
                                display: 'flex',
                                gap: 'var(--ui-kit-button-gap)',
                            }}
                        >
                            <div id="RootPluginFormulas" />
                        </div>
                        <IconButton
                            color="primary"
                            variant="outlined"
                            icon={this.UpdateIcon}
                            loading={this.state.isLoadingUpdate}
                            onClick={this.handleUpdate}
                            title="Обновить данные среза"
                        />
                        <div id="RootPluginPivot" style={{ position: 'absolute' }} />
                    </div>
                    <div id="RootPluginContextMenu" />
                    <AdapterSpreadSheet
                        ref={this.AdapterSpreadSheetRef}
                        style={{
                            height: 'auto',
                            width: 'auto',
                            flexBasis: '0',
                            flexGrow: '1',
                            minHeight: '0',
                        }}
                        tableAdapter={CanvasTableAdapter}
                        plugins={{
                            PluginHistory: {
                                component: new PluginHistory(),
                                rootId: 'RootPluginHistory',
                                options: {},
                            },
                            PluginContextMenu: {
                                component: new PluginContextMenu(),
                                rootId: 'RootPluginContextMenu',
                                options: {},
                            },
                            PluginFullscreen: {
                                component: new PluginFullscreen(),
                                rootId: 'RootPluginFullscreen',
                                options: {
                                    containerRef: this.containerRef,
                                },
                            },
                            PluginZoom: {
                                component: new PluginZoom(),
                                rootId: 'RootPluginZoom',
                                options: {},
                            },
                            PluginMetadata: {
                                component: new PluginMetadata(),
                                rootId: 'RootPluginMetadata',
                                options: {},
                            },
                            PluginJoinedCells: {
                                component: new PluginJoinedCells(),
                                rootId: 'RootPluginJoinedCells',
                                options: {},
                            },
                            PluginCursorCell: {
                                component: new PluginCursorCell(),
                                rootId: 'RootPluginCursorCell',
                                options: {},
                            },
                            PluginCellEdit: {
                                component: new PluginCellEdit(),
                                rootId: 'RootPluginCellEdit',
                                options: {},
                            },
                            PluginFormulas: {
                                component: new PluginFormulas(),
                                rootId: 'RootPluginFormulas',
                                options: {},
                            },
                            PluginCellFormatting: {
                                component: new PluginCellFormatting(),
                                rootId: 'RootPluginCellFormatting',
                                options: {},
                            },
                            PluginCellStyling: {
                                component: new PluginCellStyling(),
                                rootId: 'RootPluginCellStyling',
                                options: {},
                            },
                            PluginFrozenPanes: {
                                component: new PluginFrozenPanes(),
                                rootId: 'RootPluginFrozenPanes',
                                options: {},
                            },
                            PluginGroups: {
                                component: new PluginGroups(),
                                rootId: 'RootPluginGroups',
                                options: {},
                            },
                            PluginFill: {
                                component: new PluginFill(),
                                rootId: 'RootPluginFill',
                                options: {},
                            },
                            PluginPages: {
                                component: new PluginPages(),
                                rootId: 'RootPluginPages',
                                options: {},
                            },
                            PluginChartGeneration: {
                                component: new PluginChartGeneration(),
                                rootId: 'RootPluginChartGeneration',
                                options: {},
                            },
                            PluginPivot: {
                                // component: new NewPluginPivot(),
                                component: new PluginPivot(),
                                rootId: 'RootPluginPivot',
                                options: {
                                    cubeId: this.state.cubeId,
                                    infoserviceId: this.state.cubeId,
                                    server: `${this.state.server}/`,
                                },
                            },
                            PluginProfileQuery: {
                                component: new PluginProfileQuery(),
                                rootId: 'RootPluginProfileQuery',
                                options: {
                                    server: `${this.state.server}/`,
                                },
                            },
                            PluginFetchError: {
                                component: new PluginFetchError(),
                                rootId: 'RootPluginFetchError',
                                options: {},
                            },
                            PluginQuickCalculation: {
                                component: new PluginQuickCalculation(),
                                rootId: 'RootPluginQuickCalculation',
                                options: {},
                            },
                            PluginPersist: {
                                component: new PluginPersist(),
                                rootId: 'RootPluginPersist',
                                options: {
                                    defaultFileName: '[[ page.description ]]',
                                    compress: true,
                                    // onSaveSuccess: (fileName: string) => { console.log(`Сохранено: ${fileName}`) },
                                    // onLoadSuccess: (fileName: string) => { console.log(`Загружено: ${fileName}`) },
                                    // onError: (err: Error, op: string) => { console.error(`Ошибка ${op}: ${err.message}`) }
                                },
                            },
                        }}
                        themeOverride={{
                            bgColor: theme.colors.background.primary,
                            headerCellBg: theme.colors.background.popup,
                            headerCellAltBg: theme.colors.background.popupComplex,
                            headerCellActiveBg: theme.colors.background.highlighted,
                            // rowResizerBg: '',
                            // rowResizerIndicatorBg: '',
                            // columnResizerBg: '',
                            columnResizerIndicatorBg: '',
                            activeСellColor: theme.colors.text.primary,
                            // activeСellBg: theme.colors.background.primary,
                            activeСellBorderColor: theme.colors.basic.primary,
                            evenRowsCellBg: theme.colors.background.line,
                            evenRowsCellBorderColor: theme.colors.border.secondary,
                            evenRowsCellColor: theme.colors.text.primary,
                            oddRowsCellBg: theme.colors.background.primary,
                            oddRowsCellBorderColor: theme.colors.border.secondary,
                            oddRowsCellColor: theme.colors.text.primary,
                            selectedRangeBg: theme.colors.iconHover,
                            cmpPrimaryColor: theme.colors.basic.primary,
                            cmpPrimaryHoverColor: theme.colors.basic.primaryHover,
                            cmpSecondaryColor: theme.colors.basic.secondary,
                            cmpSecondaryHoverColor: theme.colors.basic.secondaryHover,
                            cmpControlledColor: theme.colors.basic.primary,
                            cmpControlledHoverColor: theme.colors.basic.primaryHover,
                            // textColor: theme.colors.text.primary,
                        }}
                    />

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--ui-kit-spacing-4)',
                        }}
                    >
                        <div id="RootPluginPages" />
                        <div id="RootPluginQuickCalculation" style={{ flexGrow: 1 }} />
                        <div id="RootPluginZoom" />
                        <div id="RootPluginFullscreen" />
                        <div id="RootPluginFetchError" />
                    </div>
                </div>
            </div>
        );
    }
}

export default function CubePage(props: any) {
    const [searchParams] = useSearchParams();
    const cubeId = searchParams.get('cubeId') ?? '';
    return <Cube key={cubeId || 'select'} {...props} />;
}
