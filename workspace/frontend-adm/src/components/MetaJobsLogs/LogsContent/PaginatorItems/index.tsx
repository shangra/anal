import { Component, type ReactNode } from 'react';
import { Stack } from 'ui-kit';
import styles from '../style.module.css';

interface PaginatorItemsProps {
    count: number;
    limit: number;
    nowPage: number;
    onChange: (page: number) => void;
}

/** Пагинация для логов. */
export class PaginatorItems extends Component<PaginatorItemsProps> {
    totalPages = Math.ceil(this.props.count / this.props.limit);

    render(): ReactNode {
        const { count, nowPage, onChange } = this.props;
        if (count === 0 || this.totalPages <= 1) return null;

        const pages: number[] = [];
        for (let i = 0; i < this.totalPages; i++) pages.push(i + 1);

        const showEllipsis = this.totalPages > 10;

        if (showEllipsis) {
            const firstThree = pages.slice(0, 3);
            const lastThree = pages.slice(-3);
            return (
                <Stack className={styles.paginator} gap="4px">
                    <button
                        type="button"
                        className={styles.paginatorButton}
                        disabled={nowPage <= 1}
                        onClick={() => onChange(nowPage - 1)}
                        aria-label="Previous page"
                    >
                        ‹
                    </button>
                    {firstThree.map((p) => (
                        <button
                            type="button"
                            key={p}
                            className={`${styles.paginatorButton} ${nowPage === p ? styles.paginatorButtonActive : ''}`}
                            onClick={() => onChange(p)}
                        >
                            {p}
                        </button>
                    ))}
                    <span className={styles.paginatorEllipsis}>…</span>
                    {lastThree.map((p) => (
                        <button
                            type="button"
                            key={p}
                            className={`${styles.paginatorButton} ${nowPage === p ? styles.paginatorButtonActive : ''}`}
                            onClick={() => onChange(p)}
                        >
                            {p}
                        </button>
                    ))}
                    <button
                        type="button"
                        className={styles.paginatorButton}
                        disabled={nowPage >= this.totalPages}
                        onClick={() => onChange(nowPage + 1)}
                        aria-label="Next page"
                    >
                        ›
                    </button>
                </Stack>
            );
        }

        return (
            <Stack className={styles.paginator} gap="4px">
                <button
                    type="button"
                    className={styles.paginatorButton}
                    disabled={nowPage <= 1}
                    onClick={() => onChange(nowPage - 1)}
                    aria-label="Previous page"
                >
                    ‹
                </button>
                {pages.map((p) => (
                    <button
                        type="button"
                        key={p}
                        className={`${styles.paginatorButton} ${nowPage === p ? styles.paginatorButtonActive : ''}`}
                        onClick={() => onChange(p)}
                    >
                        {p}
                    </button>
                ))}
                <button
                    type="button"
                    className={styles.paginatorButton}
                    disabled={nowPage >= this.totalPages}
                    onClick={() => onChange(nowPage + 1)}
                    aria-label="Next page"
                >
                    ›
                </button>
            </Stack>
        );
    }
}
