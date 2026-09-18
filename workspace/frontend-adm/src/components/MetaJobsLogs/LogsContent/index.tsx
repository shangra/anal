import { Component, type ReactNode } from 'react';
import { Loader } from 'ui-kit';
import $api from 'helpers/axios';
import { buildUrl } from 'helpers/buildUrl';
import $modal from 'components/ui/MyModal/modal.helper';
import { LogDetail } from '../LogDetail';
import { LogEntry, JobInfo } from './types';
import { LogItem } from './LogItem';
import { PaginatorItems } from './PaginatorItems';
import styles from './style.module.css';

interface LogsContentProps {
    server: string;
    serviceBase: string;
}

interface LogsContentState {
    jobs: JobInfo[];
    selectedJobId: string | null;
    selectedJobName: string;
    loadingJobs: boolean;
    page: number;
    jobLoading: boolean;
    count: number;
    limit: number;
    logs: LogEntry[];
    error: string | null;
    logError: string | null;
}

const PAGE_SIZE = 50;

/**
 * Двуxпанельное содержимое окна «Просмотр логов заданий».
 *
 * Левая панель — плоский список всех задач Планировщика (GET /jobs).
 * Правая панель — логи выбранной задачи (GET /logs/:id/:page)
 * с пагинацией и просмотром деталей ответа в модальном окне.
 *
 * По аналогии с `panel/src/components/Worker/WorkerDetail/WorkerDetail.js`,
 * но адаптирован под frontend-admin архитектуру.
 */
export class LogsContent extends Component<LogsContentProps, LogsContentState> {
    constructor(props: LogsContentProps) {
        super(props);
        this.state = {
            jobs: [],
            selectedJobId: null,
            selectedJobName: '',
            loadingJobs: true,
            page: 1,
            jobLoading: true,
            count: 0,
            limit: PAGE_SIZE,
            logs: [],
            error: null,
            logError: null,
        };
    }

    componentDidMount() {
        this.fetchJobs();
    }

    fetchJobs = () => {
        this.setState({ loadingJobs: true, error: null });
        const { server, serviceBase } = this.props;
        const url = buildUrl(server, serviceBase, 'jobs');

        $api
            .get(url)
            .then((res) => {
                const jobs: JobInfo[] = (res?.data?.result ?? []) as JobInfo[];
                this.setState({
                    jobs,
                    loadingJobs: false,
                    error: null,
                });
            })
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.error('LogsContent: failed to load jobs', err);
                this.setState({
                    loadingJobs: false,
                    error: 'Не удалось загрузить список заданий',
                    jobs: [],
                });
            });
    };

    selectJob = (job: JobInfo) => {
        this.setState({
            selectedJobId: job.id,
            selectedJobName: job.name || job.id,
            page: 1,
            logs: [],
            logError: null,
        }, () => this.fetchLogs(1));
    };

    fetchLogs = (page: number) => {
        const { server, serviceBase } = this.props;
        const { selectedJobId } = this.state;
        if (!selectedJobId) return;

        this.setState({ jobLoading: true, logError: null });
        const url = buildUrl(server, serviceBase, 'logs', selectedJobId, String(page - 1));

        $api
            .get(url)
            .then((res) => {
                const data = res?.data ?? {};
                this.setState({
                    page,
                    jobLoading: false,
                    count: data.count ?? 0,
                    limit: data.limit ?? PAGE_SIZE,
                    logs: Array.isArray(data.logs) ? data.logs : [],
                });
            })
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.error('LogsContent: failed to load logs', err);
                this.setState({
                    jobLoading: false,
                    logError: 'Не удалось загрузить логи задания',
                    logs: [],
                });
            });
    };

    onChangePage = (page: number) => {
        if (page === this.state.page) return;
        this.fetchLogs(page);
    };

    renderJobList() {
        const { jobs, selectedJobId, loadingJobs, error } = this.state;

        return (
            <div className={styles.jobList}>
                <div className={styles.jobListHeader}>
                    <h6>Задания Планировщика</h6>
                </div>

                {loadingJobs && (
                    <div className={styles.jobListLoader}>
                        <Loader />
                    </div>
                )}

                {error && (
                    <div className={styles.jobListError} role="alert">
                        {error}
                    </div>
                )}

                {!loadingJobs && jobs.length === 0 && (
                    <div className={styles.jobListEmpty}>Задания отсутствуют</div>
                )}

                {!loadingJobs && !error && jobs.length > 0 && (
                    <div className={styles.jobListScroll}>
                        {jobs.map((job) => (
                            <div
                                key={job.id}
                                className={`${styles.jobItem} ${
                                    selectedJobId === job.id ? styles.jobItemSelected : ''
                                }`}
                                onClick={() => this.selectJob(job)}
                            >
                                <span className={styles.jobItemName}>
                                    {job.name || job.id}
                                </span>
                                <span
                                    className={`${styles.jobStatusBadge} ${
                                        job.status !== 0 ? styles.jobStatusBadgeStopped : ''
                                    }`}
                                    title={job.status === 0 ? 'Активно' : 'Остановлено'}
                                >
                                    {job.status === 0 ? 'OK' : 'STOP'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    renderLogDetailModal = (log: LogEntry) => {
        $modal.show(
            `Сообщение от сервера — код ${log.code}`,
            <LogDetail data={log.answer} />,
            { size: 'xl', scrollable: true },
        );
    };

    renderLogsPanel() {
        const { selectedJobId, selectedJobName, jobLoading, logs, count, limit, page, logError } = this.state;

        return (
            <div className={styles.logsPanel}>
                <div className={styles.logsPanelHeader}>
                    <h6>
                        Логи задания
                        {selectedJobId
                            ? ` ${selectedJobName ? `#${selectedJobName}` : ''} (${selectedJobId.slice(0, 8)}...)`
                            : ''}
                    </h6>
                </div>

                {!selectedJobId && !jobLoading && (
                    <div className={styles.logsPanelEmpty}>
                        Выберите задание из списка слева
                    </div>
                )}

                {jobLoading && selectedJobId && (
                    <div className={styles.jobListLoader}>
                        <Loader />
                    </div>
                )}

                {logError && (
                    <div className={styles.jobListError} role="alert">
                        {logError}
                    </div>
                )}

                {!jobLoading && !logError && selectedJobId && logs.length === 0 && (
                    <div className={styles.logsPanelEmpty}>Логи отсутствуют</div>
                )}

                {!jobLoading && !logError && selectedJobId && logs.length > 0 && (
                    <>
                        <PaginatorItems
                            count={count}
                            limit={limit}
                            nowPage={page}
                            onChange={this.onChangePage}
                        />

                        <div className={styles.logsList}>
                            {logs.map((log) => (
                                <LogItem
                                    key={log.id}
                                    code={log.code}
                                    createdAt={log.createdAt}
                                    onViewDetail={() => this.renderLogDetailModal(log)}
                                />
                            ))}
                        </div>

                        <PaginatorItems
                            count={count}
                            limit={limit}
                            nowPage={page}
                            onChange={this.onChangePage}
                        />
                    </>
                )}
            </div>
        );
    }

    render(): ReactNode {
        return (
            <div className={styles.logsContent}>
                {this.renderJobList()}
                {this.renderLogsPanel()}
            </div>
        );
    }
}
