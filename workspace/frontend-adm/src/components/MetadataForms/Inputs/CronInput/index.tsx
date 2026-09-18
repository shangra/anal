import cn from 'classnames';
import { type ChangeEvent, Component, type ReactNode } from 'react';
import { CommonInput, type CommonInputProps } from 'components/CommonInput';
import $modal from 'components/ui/MyModal/modal.helper';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { ScheduleForm } from './ScheduleForm';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import commonStyle from '../style.module.css';

interface ICronInputProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    value?: string | null;
    onChange?: (value: string | null) => void;
    /** Текст в шапке модального окна */
    modalTitle?: string;
}

interface ICronInputState {
    value: string | null;
}

class CronInputContent extends Component<ICronInputProps, ICronInputState> {
    constructor(props: ICronInputProps) {
        super(props);

        this.state = {
            value: props.value ?? '',
        };
    }

    componentDidUpdate(prevProps: ICronInputProps): void {
        if (prevProps.value !== this.props.value) {
            this.setState({ value: this.props.value ?? '' });
        }
    }

    /** Колбэк сохранения из ScheduleForm: пишем новую cron-строку в state и в форму */
    private onScheduleSave = (cron: string): void => {
        const normalized = cron || null;
        this.setState({ value: normalized }, () => {
            this.props.onChange?.(normalized);
        });
        $modal.hide();
    };

    /** Открытие модального окна с конструктором расписания */
    private onClickOpen = (): void => {
        $modal.show(
            this.props.modalTitle ?? 'Расписание',
            <ScheduleForm initialCron={this.state.value} onSave={this.onScheduleSave} />,
            { size: 'lg' },
        );
    };

    private onInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const raw = e.target.value;
        const normalized = raw === '' ? null : raw;
        this.setState({ value: normalized }, () => {
            this.props.onChange?.(normalized);
        });
    };

    private onClickDelete = (): void => {
        this.setState({ value: null }, () => {
            this.props.onChange?.(null);
            this.props.onClear?.();
        });
    };

    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName('MetadataForms_Inputs_CronInputContent'),
                }}
            >
                <div className={cn(commonStyle.commonInputWrapper, this.props.containerClassName)}>
                    <CommonInput
                        {...this.props}
                        value={this.state.value ?? ''}
                        openButton
                        deleteButton
                        onChange={this.onInputChange}
                        onClickOpen={this.onClickOpen}
                        onClickDelete={this.onClickDelete}
                        placeholder={this.props.placeholder ?? 'Cron-выражение'}
                    />
                </div>
            </ErrorBoundary>
        );
    }
}

export class CronInput extends Component<ICronInputProps> {
    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName('MetadataForms_Inputs_CronInput'),
                }}
            >
                <CronInputContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
