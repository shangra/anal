import { Component, ReactNode } from 'react';
import { FileIcon, IconButton } from 'ui-kit';
import $windows from 'components/WindowsCMP/windows.helper';
import { v4 } from 'uuid';
import { LogsContent } from './LogsContent';

interface JobsLogsProps {
    title?: string;
    server?: string;
    service?: string;
}

/**
 * Кнопка «Просмотр логов заданий» для формы задачи Планировщика.
 *
 * По образцу `MetaEye` и `MetaMatrix`:
 * - рендерит `IconButton` с иконкой `FileIcon`;
 * - при клике открывает окно через `$windows.open` с двуxпанельным
 *   содержимым (LogsContent): слева список всех задач, справа — логи
 *   выбранной задачи с пагинацией и просмотром деталей ответа.
 *
 * Интегрируется через extension-хук `WorkerService.form.after`
 * модуля `meta-jobs-logs` на бэкенде.
 */
export class MetaJobsLogs extends Component<JobsLogsProps, {}> {
    private server: string;

    constructor(props: JobsLogsProps) {
        super(props);
        this.server = (props.server || '').replace(/\/+$/gm, '');
    }

    openLogsWindow = (): void => {
        const { service = 'metadata/meta-jobs-logs', title = 'Просмотр логов заданий' } = this.props;
        const cmp = <LogsContent server={this.server} serviceBase={service} />;
        const uuid = v4();
        $windows.open(title, cmp, {
            width: '1400px',
            height: '800px',
            uuid: `JobsLogs::${uuid}`,
        });
    };

    render(): ReactNode {
        return (
            <div>
                <IconButton
                    title={this.props.title}
                    icon={FileIcon}
                    onClick={this.openLogsWindow}
                    variant="outlined"
                    rounded
                />
            </div>
        );
    }
}
