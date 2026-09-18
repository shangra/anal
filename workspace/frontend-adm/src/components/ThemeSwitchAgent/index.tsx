import { Component, ReactNode } from 'react';
import StateManager from 'lite-react-statemanager';
import { Button, DARK_THEME, Popover, SettingIcon, ThemeProvider } from 'ui-kit';
import { ThemeSwitchAgentProps, ThemeSwitchAgentState, Themes } from 'components/ThemeSwitchAgent/types';
import { THEMES } from 'components/ThemeSwitchAgent/constants';
import $windows from 'components/WindowsCMP/windows.helper';
import { PanelPosition } from 'components/WindowsCMP/interfaces';

type ThemeValue = Themes | 'auto';

interface IThemeOption {
    label: string;
    value: ThemeValue;
}

const THEME_OPTIONS: IThemeOption[] = [
    { label: 'Светлая', value: 'light' },
    { label: 'Тёмная', value: 'dark' },
    { label: 'Галактика', value: 'galaxy' },
    { label: 'Авто', value: 'auto' },
];

export class ThemeSwitchAgent extends Component<ThemeSwitchAgentProps, ThemeSwitchAgentState> {
    constructor(props: ThemeSwitchAgentProps) {
        super(props);
        this.state = {
            currentTheme: DARK_THEME,
            themeUUID: '',
            isPopoverOpened: false,
        };
    }

    componentDidMount() {
        StateManager.subscribeState({ theme: { subTheme: this.subTheme } });

        // setTimeout нужен, чтобы не перезатирал кнопку переключения серверов 
        setTimeout(() => {
        const themeUUID = $windows.open(
            <Popover
                placement='bottom-start'
                offset={16}
                closeOnOutsideClick
                closeOnContentClick
                content={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
                        {THEME_OPTIONS.map((option) => (
                            <Button
                                key={option.value}
                                variant='text'
                                fullWidth
                                onClick={this.setTheme(option.value)}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                }
            >
                <SettingIcon
                    color="white"
                    onMouseDown={(e: { stopPropagation: () => void }) => e.stopPropagation()}
                    testId='theme-switch-agent::open-button'
                    style={{ padding: 1 }}
                />
            </Popover>,
            null,
            {
                position: PanelPosition.left,
                type: 'setting',
            }
        );
        this.setState({ themeUUID });
        }, 0)

    }

    componentWillUnmount() {
        StateManager.unsubscribeState({ theme: ['subTheme'] });
        $windows.close(this.state.themeUUID);
    }

    setTheme = (theme: ThemeValue) => () => {
        StateManager.setState({ theme });
        this.setState({ isPopoverOpened: false });
    };

    subTheme = (theme: { theme: ThemeValue }) => {
        const selectedTheme: ThemeValue = ['dark', 'light', 'galaxy', 'auto'].includes(theme?.theme) ? theme.theme : 'dark';

        if (selectedTheme === 'auto') {
            const osTheme = window.matchMedia('(prefers-color-scheme: light)');
            const currentTheme = osTheme.matches ? 'light' : 'dark';
            this.setState({
                currentTheme: THEMES[currentTheme],
            });

            return;
        }

        this.setState({
            currentTheme: THEMES[selectedTheme],
        });
    };

    render(): ReactNode {
        return <ThemeProvider theme={this.state.currentTheme}>{this.props.children}</ThemeProvider>;
    }
}
