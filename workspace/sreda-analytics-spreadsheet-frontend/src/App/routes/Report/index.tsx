import React, { createRef } from 'react';
import { Theme } from 'ui-kit';

import AdapterSpreadSheet from '../../../components/AdapterSpreadSheet';
import {
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
    PluginProfileQuery,
    PluginQuickCalculation,
    PluginReports,
    PluginZoom,
} from '../../../components/SpreadSheetPlugins';
import { PluginChartGeneration } from '../../../components/SpreadSheetPlugins/PluginChartGeneration';
import { CanvasTableAdapter } from '../../../components/TableAdapters/CanvasTableAdapter';
import { Accordion } from '../../../components/UIKit/Accordion';

interface IAppState {
    reportId: string;
    description: string;
    server: string;
    theme?: Theme;
}

class Report extends React.Component<any, IAppState> {
    containerRef: React.RefObject<HTMLDivElement>;

    AdapterSpreadSheetRef: React.RefObject<AdapterSpreadSheet>;

    constructor(props: any) {
        super(props);

        this.containerRef = createRef();
        this.AdapterSpreadSheetRef = createRef();

        const { search } = window.location;
        const queryParams = new URLSearchParams(search);

        const reportId = queryParams.get('reportId') ?? '';
        const description = queryParams.get('description') ?? '';
        const server = (queryParams.get('server') ?? '').replace(/\/+$/gm, '');

        this.state = {
            reportId,
            description,
            server,
        };
    }

    render() {
        const { theme } = this.props;
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
                        <div id="RootPluginReports" style={{ position: 'absolute' }} />
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
                            PluginReports: {
                                component: new PluginReports(),
                                rootId: 'RootPluginReports',
                                options: {
                                    reportId: this.state.reportId,
                                    infoserviceId: this.state.reportId,
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
                                    defaultFileName: 'my-report',
                                    compress: true,
                                    // persistPluginStateKeys: [
                                    //     'PluginMetadata', // размеры строк/колонок
                                    //     'PluginJoinedCells', // объединения
                                    //     'PluginHeaderGroups', // группировки
                                    //     'PluginReports',
                                    // ],
                                    // onSaveSuccess: (fileName: string) => console.log(`Сохранено: ${fileName}`),
                                    // onLoadSuccess: (fileName: string) => console.log(`Загружено: ${fileName}`),
                                    // onError: (err: Error, op: string) => console.error(`Ошибка ${op}: ${err.message}`),
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

export default Report;
