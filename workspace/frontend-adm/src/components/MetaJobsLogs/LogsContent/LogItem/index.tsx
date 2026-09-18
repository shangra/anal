import { Component, type ReactNode } from 'react';
import styles from '../style.module.css';

interface LogItemProps {
    code: number;
    createdAt: string;
    onViewDetail: () => void;
}

/** Отдельная запись лога с кнопкой просмотра деталей. */
export class LogItem extends Component<LogItemProps> {
    formatDate = (raw: string | undefined | null) => {
        if (!raw) return '';
        try {
            return new Date(raw).toLocaleString('ru');
        } catch {
            return String(raw);
        }
    };

    render(): ReactNode {
        const { code, createdAt, onViewDetail } = this.props;
        const date = this.formatDate(createdAt);

        return (
            <div className={styles.logItem}>
                <div className={styles.logItemInfo}>
                    <div className={styles.logItemCode}>{code}</div>
                    <div className={styles.logItemDate}>{date}</div>
                </div>
                <button
                    type="button"
                    className="btn btn-sm btn-info"
                    onClick={onViewDetail}
                    title="Просмотр содержимого ответа"
                >
                    <i className="bi bi-body-text me-1" />
                    Просмотр
                </button>
            </div>
        );
    }
}
