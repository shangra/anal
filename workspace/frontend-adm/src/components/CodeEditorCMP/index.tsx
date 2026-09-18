import React, { Component } from 'react';

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-jsoniq';
import 'ace-builds/src-noconflict/mode-jsx';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/ext-language_tools';

import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/theme-kuroir';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/theme-textmate';
import 'ace-builds/src-noconflict/theme-solarized_dark';
import 'ace-builds/src-noconflict/theme-solarized_light';
import 'ace-builds/src-noconflict/theme-terminal';

import styles from './styles.module.css';

import 'brace/ext/searchbox';

import { Timer } from 'helpers/timer';
import { Button, IconButton, Popover, Select, SettingIcon, Stack } from 'ui-kit';
import {
    LOCAL_STORAGE_CODE_EDITOR_THEME_KEY,
    DEFAULT_CODE_EDITOR_THEME,
    CODE_EDITOR_THEMES,
} from 'components/CodeEditorCMP/constants';

import { html as beautifyHtml } from 'js-beautify';

import type { CodeEditorCMPProps, CodeEditorCMPState } from 'components/CodeEditorCMP/types';

import jsx2json from 'components/CodeEditorCMP/jsx2json';

export class CodeEditorCMP extends Component<CodeEditorCMPProps, CodeEditorCMPState> {
    private componentName: string;

    private timerUpdate: Timer;

    constructor(props: CodeEditorCMPProps) {
        super(props);

        this.componentName = `CodeEditorCMP_${this.props.subKey ?? ''}`;

        this.state = {
            value: this.props.value ?? '',
            jsxStatus: false,
            modeType: this.props.modeType ?? 'jsx',
            theme:
                (typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_CODE_EDITOR_THEME_KEY) : null) ??
                DEFAULT_CODE_EDITOR_THEME,
            showToolbar: this.props.showToolbar ?? false,
        };

        this.timerUpdate = new Timer(200);
    }

    // convertHTMLToJSON = (value: string): unknown => jsx2json(value, { useEval: true });

    isJSX(data: string): boolean {
        let result = false;
        try {
            jsx2json(data, { useEval: true });
            result = true;
        } catch (_e) {
            result = false;
        }

        return result;
    }

    isJSON(data: string): boolean {
        try {
            JSON.parse(data);
            return true;
        } catch (_e) {
            return false;
        }
    }

    toggleMode = (): void => {
        this.setState((prevState) => ({
            modeType: prevState.modeType === 'jsx' ? 'javascript' : 'jsx',
        }));
    };

    componentDidMount(): void {
        this.setState({
            jsxStatus: this.isJSX(this.props.value ?? ''),
        });
    }

    componentDidUpdate(prevProps: CodeEditorCMPProps): void {
        if (prevProps.value !== this.props.value) {
            this.setState({
                value: this.props.value ?? '',
                jsxStatus: this.isJSX(this.props.value ?? ''),
            });
        }

        if (prevProps.showToolbar !== this.props.showToolbar) {
            this.setState({
                showToolbar: this.props.showToolbar ?? false,
            });
        }
    }

    updateStatus = (): void => {
        const data = this.state.value;

        const jsxStatus = this.isJSX(data);
        this.setState({ jsxStatus });

        if (this.props.onChange) {
            this.props.onChange(data);
        }
    };

    CodeStyle = (): void => {
        const data = this.state.value;

        if (this.isJSON(data)) {
            // code style for json
            const jsonObject = JSON.parse(data);
            const newData = JSON.stringify(jsonObject, null, '    ');
            this.setState({ value: newData });
        } else if (this.isJSX(data)) {
            // code style for html
            const newData = beautifyHtml(data, {
                indent_size: 4,
            });
            this.setState({ value: newData });
        }
    };

    render(): React.ReactNode {
        const Modes = this.state.showToolbar && (
            <Stack justifyContent="space-between" alignItems="center">
                <Button onClick={this.toggleMode} color={this.state.jsxStatus ? 'success' : 'error'}>
                    {this.state.modeType === 'jsx' ? 'JSX' : 'JS'}
                </Button>

                <Popover
                    content={
                        <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                            <span style={{ whiteSpace: 'nowrap' }}>Тема редактора кода</span>
                            <Select
                                value={this.state.theme}
                                options={CODE_EDITOR_THEMES}
                                title="code editor theme selector"
                                resettable
                                onChange={(value: string | null) => {
                                    if (value !== null) {
                                        this.setState({ theme: value });
                                        localStorage.setItem(LOCAL_STORAGE_CODE_EDITOR_THEME_KEY, value);
                                    }
                                }}
                            />
                        </div>
                    }
                    placement="bottom-end"
                >
                    <IconButton icon={SettingIcon} style={{ marginTop: '5px' }} variant="outlined" rounded />
                </Popover>
            </Stack>
        );

        return (
            <div className={styles.container} style={this.props.style}>
                {Modes}
                <div
                    className={styles['container-editor']}
                    onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                        const event = e.nativeEvent as KeyboardEvent;

                        // cmd/ctrl + S
                        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                            if (this.props.onSave !== undefined) {
                                this.props.onSave(this.state.value);
                            }
                            event.preventDefault();
                            return;
                        }

                        // cmd/ctrl + alt + L
                        if ((event.metaKey || event.ctrlKey) && event.altKey && event.key === 'l') {
                            this.CodeStyle();
                            event.preventDefault();
                        }
                    }}
                >
                    <AceEditor
                        mode={this.state.modeType === 'jsx' ? 'jsx' : 'javascript'}
                        theme={this.state.theme}
                        value={this.state.value}
                        style={{ width: '100%', height: '100%' }}
                        onChange={(value: string) => {
                            this.setState({ value }, () => {
                                this.timerUpdate.start(this.updateStatus);
                            });
                        }}
                        showPrintMargin
                        showGutter
                        highlightActiveLine
                        name={this.componentName}
                        editorProps={{ $blockScrolling: true }}
                        setOptions={{
                            useWorker: false,
                            enableSnippets: false,
                            enableBasicAutocompletion: true,
                            enableLiveAutocompletion: true,
                        }}
                    />
                </div>
            </div>
        );
    }
}
