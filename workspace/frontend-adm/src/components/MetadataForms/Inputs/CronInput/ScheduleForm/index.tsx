import { Component, type ChangeEvent, type ReactNode } from 'react';
import { Button, Checkbox, Input, Switch, Tabs, Tab, TextArea, Stack } from 'ui-kit';
import { ErrorBoundary } from 'components/ErrorBoundary';
import {
    type ScheduleObject,
    parseCronToSchedule,
    scheduleToCron,
    scheduleToHumanReadable,
} from '../cronParser';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import style from './style.module.css';

const WEEKDAY_KEYS = [
    { key: 'monday', label: 'Пн' },
    { key: 'tuesday', label: 'Вт' },
    { key: 'wednesday', label: 'Ср' },
    { key: 'thursday', label: 'Чт' },
    { key: 'friday', label: 'Пт' },
    { key: 'saturday', label: 'Сб' },
    { key: 'sunday', label: 'Вс' },
] as const;

const MONTH_GROUPS: ReadonlyArray<ReadonlyArray<{ key: string; label: string }>> = [
    [
        { key: 'January', label: 'Январь' },
        { key: 'April', label: 'Апрель' },
        { key: 'July', label: 'Июль' },
        { key: 'October', label: 'Октябрь' },
    ],
    [
        { key: 'February', label: 'Февраль' },
        { key: 'May', label: 'Май' },
        { key: 'August', label: 'Август' },
        { key: 'November', label: 'Ноябрь' },
    ],
    [
        { key: 'March', label: 'Март' },
        { key: 'June', label: 'Июнь' },
        { key: 'September', label: 'Сентябрь' },
        { key: 'December', label: 'Декабрь' },
    ],
];

type TabKey = 'general' | 'weekly' | 'monthDays' | 'monthly';

interface IScheduleFormProps {
    /** Текущее cron-выражение из формы, используется для предзаполнения UI при открытии */
    initialCron: string | null | undefined;
    /** Колбэк сохранения: получает готовую cron-строку */
    onSave: (cron: string) => void;
}

interface IScheduleFormState {
    schedule: ScheduleObject;
    scheduleText: string;
    performance: string;
}

class ScheduleFormContent extends Component<IScheduleFormProps, IScheduleFormState> {
    constructor(props: IScheduleFormProps) {
        super(props);

        const schedule = parseCronToSchedule(props.initialCron);
        const scheduleText = scheduleToCron(schedule);
        const performance = scheduleToHumanReadable(schedule);

        this.state = {
            schedule,
            scheduleText,
            performance,
        };
    }

    componentDidUpdate(prevProps: IScheduleFormProps): void {
        if (prevProps.initialCron !== this.props.initialCron) {
            const schedule = parseCronToSchedule(this.props.initialCron);
            this.setState({
                schedule,
                scheduleText: scheduleToCron(schedule),
                performance: scheduleToHumanReadable(schedule),
            });
        }
    }

    /** Любое изменение внутри schedule — пересчитываем cron и человеческое описание */
    private updateSchedule = (patch: Partial<ScheduleObject>): void => {
        this.setState(
            (prev) => {
                const schedule = { ...prev.schedule, ...patch };
                return {
                    schedule,
                    scheduleText: scheduleToCron(schedule),
                    performance: scheduleToHumanReadable(schedule),
                };
            },
        );
    };

    /** Переключатель «раз в» (type=1) / «каждые» (type=0) для hour/minute/second */
    private onToggleType = (name: 'typeHour' | 'typeMinute' | 'typeSecond'): void => {
        this.updateSchedule({
            [name]: this.state.schedule[name] === 1 ? 0 : 1,
        } as Partial<ScheduleObject>);
    };

    /** Изменение числового значения hour/minute/second */
    private onNumberChange = (name: 'hour' | 'minute' | 'second') => (e: ChangeEvent<HTMLInputElement>): void => {
        const raw = e.target.value;
        const value = raw === '' ? 0 : parseInt(raw, 10);
        this.updateSchedule({
            [name]: Number.isFinite(value) && value >= 0 ? value : 0,
        } as Partial<ScheduleObject>);
    };

    /** Изменение дня недели / месяца (чекбокс) */
    private onFlagChange = (name: keyof ScheduleObject) => (): void => {
        const current = this.state.schedule[name];
        if (current === 0 || current === 1) {
            this.updateSchedule({
                [name]: current === 1 ? 0 : 1,
            } as Partial<ScheduleObject>);
        }
    };

    /** Изменение конкретного дня месяца */
    private onDayChange = (index: number) => (): void => {
        const days = [...this.state.schedule.days];
        days[index] = !days[index];
        this.updateSchedule({ days });
    };

    private selectAllDays = (value: boolean): void => {
        this.updateSchedule({ days: new Array<boolean>(31).fill(value) });
    };

    private onSave = (): void => {
        this.props.onSave(this.state.scheduleText);
    };

    private renderTimeRow = (
        label: string,
        typeName: 'typeHour' | 'typeMinute' | 'typeSecond',
        value: number,
        typeValue: 0 | 1,
        max: number,
        valueName: 'hour' | 'minute' | 'second',
    ): ReactNode => {
        return (
            <Stack direction="row" alignItems="center" gap="16px" wrap="wrap">
                <Stack style={{ flex: '1 1 140px' }} gap="4px">
                    <label style={{ fontWeight: 500 }}>{label}</label>
                </Stack>
                <Stack style={{ flex: '0 0 80px' }} alignItems="center" gap="8px">
                    <Switch
                        name={typeName}
                        checked={typeValue === 1}
                        onChange={this.onToggleType.bind(this, typeName)}
                    />
                    <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {typeValue ? 'раз в' : 'каждые'}
                    </span>
                </Stack>
                <Stack style={{ flex: '1 1 100px' }} gap="4px">
                    <Input
                        type="number"
                        name={valueName}
                        value={String(value)}
                        onChange={this.onNumberChange(valueName)}
                        fullWidth
                    />
                </Stack>
            </Stack>
        );
    };

    private renderGeneral = (): ReactNode => {
        const { schedule } = this.state;
        return (
            <>
                {this.renderTimeRow('Часы', 'typeHour', schedule.hour, schedule.typeHour, 24, 'hour')}
                {this.renderTimeRow('Минуты', 'typeMinute', schedule.minute, schedule.typeMinute, 59, 'minute')}
                {this.renderTimeRow('Секунды', 'typeSecond', schedule.second, schedule.typeSecond, 59, 'second')}
            </>
        );
    };

    private renderWeekly = (): ReactNode => {
        return (
            <Stack gap="8px" wrap="wrap" justifyContent="center">
                {WEEKDAY_KEYS.map(({ key, label }) => (
                    <Checkbox
                        key={key}
                        name={`weekday_${key}`}
                        label={label}
                        checked={this.state.schedule[key as keyof ScheduleObject] === 1}
                        onChange={this.onFlagChange(key as keyof ScheduleObject)}
                    />
                ))}
            </Stack>
        );
    };

    private renderMonthDays = (): ReactNode => {
        return (
            <>
                <Stack direction="row"
                    wrap='wrap'
                    justifyContent="center" gap="16px" style={{ marginBottom: '16px' }}>
                    <Button variant="contained" onClick={() => this.selectAllDays(true)}>
                        Выбрать все
                    </Button>
                    <Button variant="outlined" onClick={() => this.selectAllDays(false)}>
                        Отменить все
                    </Button>
                </Stack>
                <Stack gap="8px" wrap="wrap" justifyContent="center">
                    {this.state.schedule.days.map((selected, i) => (
                        <Checkbox
                            key={`day_${i}`}
                            name={`day_${i}`}
                            label={String(i + 1)}
                            checked={selected}
                            onChange={this.onDayChange(i)}
                        />
                    ))}
                </Stack>
            </>
        );
    };

    private renderMonthly = (): ReactNode => {
        return (
            <Stack gap="8px"
                wrap='wrap'
                justifyContent="center">
                {MONTH_GROUPS.map((group) => (
                    <Stack key={group[0].key} direction="row" gap="8px" justifyContent="center">
                        {group.map(({ key, label }) => (
                            <Checkbox
                                key={key}
                                name={`month_${key}`}
                                label={label}
                                checked={this.state.schedule[key as keyof ScheduleObject] === 1}
                                onChange={this.onFlagChange(key as keyof ScheduleObject)}
                            />
                        ))}
                    </Stack>
                ))}
            </Stack>
        );
    };

    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName('MetadataForms_Inputs_CronInput_ScheduleForm'),
                }}
            >
                <div className={style.scheduleForm}>
                    <Tabs variant="rounded" style={{ marginBottom: '20px' }}>
                        <Tab label="Общие">
                            {this.renderGeneral()}
                        </Tab>
                        <Tab label="По дням">
                            {this.renderMonthDays()}
                        </Tab>
                        <Tab label="Месячное">
                            {this.renderMonthly()}
                        </Tab>
                        <Tab label="Недельное">
                            {this.renderWeekly()}
                        </Tab>
                    </Tabs>

                    <Stack gap="16px" style={{marginTop: '20px'}} direction="column">
                        <Stack gap="4px">
                            <label style={{ fontWeight: 500 }}>
                                Представление
                            </label>
                            <TextArea
                                value={this.state.performance}
                                readOnly
                                fullWidth
                                style={{ minHeight: '72px' }}
                            />
                        </Stack>

                        <Stack gap="4px">
                            <label style={{ fontWeight: 500 }}>
                                Шаблон
                            </label>
                            <Input
                                type="text"
                                value={this.state.scheduleText}
                                disabled
                                fullWidth
                            />
                        </Stack>

                        <Stack justifyContent="center">
                            <Button variant="contained" onClick={this.onSave}>
                                Ok
                            </Button>
                        </Stack>
                    </Stack>
                </div>
            </ErrorBoundary>
        );
    }
}

export class ScheduleForm extends Component<IScheduleFormProps> {
    static defaultProps = {
        initialCron: '',
    };

    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName('MetadataForms_Inputs_CronInput_ScheduleForm'),
                }}
            >
                <ScheduleFormContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
