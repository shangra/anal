import cn from 'classnames';
import React, { FC, MouseEventHandler, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { COLUMNS_HEADER_HEIGHT, ROWS_HEADER_WIDTH, SCROLLBAR_TRACK_PADDING } from '../../const';
import { CanvasSpreadSheetContext } from '../../context';
import { useCamera } from '../../hooks/useCamera.hook';
import { MIN_LENGTH_THUMB } from './constants';
import styles from './style.module.css';
import { IScrollbarProps } from './types';

export const Scrollbar: FC<IScrollbarProps> = ({ children }) => {
    const {
        camera,
        columnsMetadata,
        height,
        overlayRef,
        rowsMetadata,
        setCamera,
        width,
        hasColumnsHeader,
        hasRowsHeader,
        frozenColumns,
        frozenRows,
    } = useContext(CanvasSpreadSheetContext);

    const { maxCameraX, maxCameraY } = useCamera();

    const observerVertical = useRef<ResizeObserver>();
    const observerHorizontal = useRef<ResizeObserver>();

    // Vertical
    const scrollTrackVerticalRef = useRef<HTMLDivElement>(null);
    const scrollThumbVerticalRef = useRef<HTMLDivElement>(null);
    const initialOffsetVerticalRef = useRef(0);
    const [thumbVerticalHeight, setThumbVerticalHeight] = useState<number>(MIN_LENGTH_THUMB);
    const isDraggingVerticalRef = useRef<boolean>(false);
    // Horizontal
    const scrollTrackHorizontalRef = useRef<HTMLDivElement>(null);
    const scrollThumbHorizontalRef = useRef<HTMLDivElement>(null);
    const initialOffsetHorizontalRef = useRef(0);
    const [thumbHorizontalWidth, setThumbHorizontalWidth] = useState<number>(MIN_LENGTH_THUMB);
    const isDraggingHorizontalRef = useRef<boolean>(false);

    // Обработка клика по треку вертикального скроллбара
    const handleVerticalTrackClick: MouseEventHandler<HTMLDivElement> = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { current: trackRef } = scrollTrackVerticalRef;
            const { current: contentRef } = overlayRef;
            if (trackRef && contentRef) {
                const { clientY } = e;
                const target = e.target as HTMLDivElement;

                const trackRect = target.getBoundingClientRect();
                let trackClientY = clientY - trackRect.top;
                const tractHeightWithoutThumb = trackRect.height - thumbVerticalHeight;
                const minTractY = 0;
                const maxTractY = tractHeightWithoutThumb;
                if (trackClientY < minTractY) trackClientY = 0;
                else if (trackClientY > maxTractY) trackClientY = maxTractY;

                const ratio = maxTractY > 0 ? trackClientY / maxTractY : 0;
                const newCameraY = ratio * maxCameraY;
                setCamera((prev) => ({ ...prev, y: -newCameraY }));
            }
        },
        [maxCameraY, overlayRef, thumbVerticalHeight, setCamera],
    );

    // Обработка клика по треку горизонтального скроллбара
    const handleHorizontalTrackClick: MouseEventHandler<HTMLDivElement> = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { current: trackRef } = scrollTrackHorizontalRef;
            const { current: contentRef } = overlayRef;
            if (trackRef && contentRef) {
                const { clientX } = e;
                const target = e.target as HTMLDivElement;

                const trackRect = target.getBoundingClientRect();
                let trackClientX = clientX - trackRect.left;
                const tractWidthWithoutThumb = trackRect.width - thumbHorizontalWidth;
                const minTractX = 0;
                const maxTractX = tractWidthWithoutThumb;
                if (trackClientX < minTractX) trackClientX = 0;
                else if (trackClientX > maxTractX) trackClientX = maxTractX;

                const ratio = maxTractX > 0 ? trackClientX / maxTractX : 0;
                const newCameraX = ratio * maxCameraX;

                setCamera((prev) => ({ ...prev, x: -newCameraX }));
            }
        },
        [maxCameraX, overlayRef, thumbHorizontalWidth, setCamera],
    );

    // Обработка положения вертикального скроллбара
    const handleThumbVerticalPosition = useCallback(() => {
        if (!overlayRef.current || !scrollTrackVerticalRef.current || !scrollThumbVerticalRef.current) return;

        const availableHeight = height - SCROLLBAR_TRACK_PADDING - thumbVerticalHeight;

        // Используем соотношение camera.y к maxCameraY
        const scrollRatio = maxCameraY > 0 ? Math.abs(camera.y) / maxCameraY : 0;
        const topOffset = scrollRatio * availableHeight;

        scrollThumbVerticalRef.current.style.top = `${topOffset}px`;
    }, [overlayRef, height, thumbVerticalHeight, camera.y, maxCameraY]);

    // Обработка положения горизонтального скроллбара
    const handleThumbHorizontalPosition = useCallback(() => {
        if (!overlayRef.current || !scrollTrackHorizontalRef.current || !scrollThumbHorizontalRef.current) return;

        const availableWidth = width - SCROLLBAR_TRACK_PADDING - thumbHorizontalWidth;

        const scrollRatio = maxCameraX > 0 ? Math.abs(camera.x) / maxCameraX : 0;
        const leftOffset = scrollRatio * availableWidth;

        scrollThumbHorizontalRef.current.style.left = `${leftOffset}px`;
    }, [overlayRef, width, thumbHorizontalWidth, camera.x, maxCameraX]);

    const handleThumbMousedownVertical: MouseEventHandler<HTMLDivElement> = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (scrollThumbVerticalRef.current) {
            const thumbRect = scrollThumbVerticalRef.current.getBoundingClientRect();
            initialOffsetVerticalRef.current = event.clientY - thumbRect.top;
        }
        isDraggingVerticalRef.current = true;
    };

    const handleThumbMousedownHorizontal: MouseEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (scrollThumbHorizontalRef.current) {
            const thumbRect = scrollThumbHorizontalRef.current.getBoundingClientRect();
            initialOffsetHorizontalRef.current = e.clientX - thumbRect.left;
        }
        isDraggingHorizontalRef.current = true;
    };

    const handleThumbMousemoveVertical = useCallback(
        (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            if (isDraggingVerticalRef.current) {
                const { clientY } = event;
                const target = scrollTrackVerticalRef.current as HTMLDivElement;

                const trackRect = target.getBoundingClientRect();
                let trackClientY = clientY - trackRect.top - initialOffsetVerticalRef.current;

                const tractHeightWithoutThumb = trackRect.height - thumbVerticalHeight;
                const minTractY = 0;
                const maxTractY = tractHeightWithoutThumb;
                if (trackClientY < minTractY) {
                    trackClientY = minTractY;
                } else if (trackClientY > maxTractY) {
                    trackClientY = maxTractY;
                }

                const ratio = maxTractY > 0 ? trackClientY / maxTractY : 0;
                const newCameraY = ratio * maxCameraY;

                setCamera((prev) => ({ ...prev, y: -newCameraY }));
            }
        },
        [maxCameraY, setCamera, thumbVerticalHeight],
    );

    const handleThumbMousemoveHorizontal = useCallback(
        (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (isDraggingHorizontalRef.current) {
                const { clientX } = e;
                const target = scrollTrackHorizontalRef.current as HTMLDivElement;

                const trackRect = target.getBoundingClientRect();
                let trackClientX = clientX - trackRect.left - initialOffsetHorizontalRef.current;

                const tractWidthWithoutThumb = trackRect.width - thumbHorizontalWidth;
                const minTractX = 0;
                const maxTractX = tractWidthWithoutThumb;
                if (trackClientX < minTractX) {
                    trackClientX = minTractX;
                } else if (trackClientX > maxTractX) {
                    trackClientX = maxTractX;
                }

                const ratio = maxTractX > 0 ? trackClientX / maxTractX : 0;
                const newCameraX = ratio * maxCameraX;

                setCamera((prev) => ({ ...prev, x: -newCameraX }));
            }
        },
        [maxCameraX, setCamera, thumbHorizontalWidth],
    );

    useEffect(() => {
        // Расчёт размера thumb в вертикальном скроллбаре
        const handleResizeVertical = () => {
            const lastRowMetadata = rowsMetadata.at(-1);
            if (!lastRowMetadata) return;

            // Высота заголовка в world space
            const headersHeight = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;

            // Frozen область в world space
            const frozenHeight =
                frozenRows > 0 && rowsMetadata.at(frozenRows - 1)
                    ? rowsMetadata.at(frozenRows - 1).y + rowsMetadata.at(frozenRows - 1).height
                    : 0;

            // Видимая область в world space (учитываем zoom!)
            const visibleHeight = height / camera.z - headersHeight - frozenHeight;

            // Scrollable контент в world space (используем maxCameraY для точного расчета)
            const scrollableContentHeight = maxCameraY > 0 ? maxCameraY + visibleHeight : visibleHeight;

            // Размер thumb должен отражать соотношение видимой области к общему контенту
            const thumbRatio = scrollableContentHeight > 0 ? Math.min(1, visibleHeight / scrollableContentHeight) : 1;

            // Доступная высота для скроллбара в screen space (вычитаем отступы)
            const availableTrackHeight = height - SCROLLBAR_TRACK_PADDING;

            setThumbVerticalHeight(Math.max(Math.round(availableTrackHeight * thumbRatio), MIN_LENGTH_THUMB));
        };
        handleThumbVerticalPosition();

        const ref = overlayRef.current as Element;

        observerVertical.current = new ResizeObserver(handleResizeVertical);
        observerVertical.current.observe(ref);

        return () => {
            observerVertical.current?.unobserve(ref);
        };
    }, [camera.z, frozenRows, hasColumnsHeader, height, overlayRef, rowsMetadata, maxCameraY]);

    useEffect(() => {
        // Расчёт размера thumb в горизонтальном скроллбаре
        const handleResizeHorizontal = () => {
            const lastColumnMetadata = columnsMetadata.at(-1);
            if (!lastColumnMetadata) return;

            // Ширина заголовка в world space
            const headersWidth = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;

            // Frozen область в world space
            const frozenWidth =
                frozenColumns > 0 && columnsMetadata.at(frozenColumns - 1)
                    ? columnsMetadata.at(frozenColumns - 1).x + columnsMetadata.at(frozenColumns - 1).width
                    : 0;

            // Видимая область в world space (учитываем zoom!)
            const visibleWidth = width / camera.z - headersWidth - frozenWidth;

            // Scrollable контент в world space (используем maxCameraX для точного расчета)
            const scrollableContentWidth = maxCameraX > 0 ? maxCameraX + visibleWidth : visibleWidth;

            // Размер thumb должен отражать соотношение видимой области к общему контенту
            const thumbRatio = scrollableContentWidth > 0 ? Math.min(1, visibleWidth / scrollableContentWidth) : 1;

            // Доступная ширина для скроллбара в screen space
            const availableTrackWidth = width - SCROLLBAR_TRACK_PADDING;

            setThumbHorizontalWidth(Math.max(Math.round(availableTrackWidth * thumbRatio), MIN_LENGTH_THUMB));
        };
        handleThumbHorizontalPosition();

        const ref = overlayRef.current as Element;

        observerHorizontal.current = new ResizeObserver(handleResizeHorizontal);
        observerHorizontal.current.observe(ref);

        return () => {
            observerHorizontal.current?.unobserve(ref);
        };
    }, [camera.z, columnsMetadata, frozenColumns, hasRowsHeader, overlayRef, width, maxCameraX]);

    // Подписки на события для вертикального скроллбара
    useEffect(() => {
        const handleThumbMouseupVertical = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (isDraggingVerticalRef.current) {
                isDraggingVerticalRef.current = false;
            }
        };

        document.addEventListener('mousemove', handleThumbMousemoveVertical);
        document.addEventListener('mouseup', handleThumbMouseupVertical);
        document.addEventListener('mouseleave', handleThumbMouseupVertical);

        return () => {
            document.removeEventListener('mousemove', handleThumbMousemoveVertical);
            document.removeEventListener('mouseup', handleThumbMouseupVertical);
            document.removeEventListener('mouseleave', handleThumbMouseupVertical);
        };
    }, [handleThumbMousemoveVertical]);

    // Подписки на события для горизонтального скроллбара
    useEffect(() => {
        const handleThumbMouseupHorizontal = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (isDraggingHorizontalRef.current) {
                isDraggingHorizontalRef.current = false;
            }
        };

        document.addEventListener('mousemove', handleThumbMousemoveHorizontal);
        document.addEventListener('mouseup', handleThumbMouseupHorizontal);
        document.addEventListener('mouseleave', handleThumbMouseupHorizontal);

        return () => {
            document.removeEventListener('mousemove', handleThumbMousemoveHorizontal);
            document.removeEventListener('mouseup', handleThumbMouseupHorizontal);
            document.removeEventListener('mouseleave', handleThumbMouseupHorizontal);
        };
    }, [handleThumbMousemoveHorizontal]);

    // Обновление позиции thumb при изменении камеры
    useEffect(() => {
        handleThumbVerticalPosition();
    }, [handleThumbVerticalPosition, camera.y]);

    useEffect(() => {
        handleThumbHorizontalPosition();
    }, [handleThumbHorizontalPosition, camera.x]);

    return (
        <div className={styles.custom_scrollbars_container}>
            <div className={styles.custom_scrollbars_content}>{children}</div>
            <div className={cn(styles.custom_scrollbars_scrollbar, styles.custom_scrollbars_scrollbar_horizontal)}>
                <div
                    className={cn(
                        styles.custom_scrollbars_track_and_thumb,
                        styles.custom_scrollbars_track_and_thumb_horizontal,
                    )}
                >
                    <div
                        className={cn(styles.custom_scrollbars_track, styles.custom_scrollbars_track_horizontal)}
                        ref={scrollTrackHorizontalRef}
                        onClick={handleHorizontalTrackClick}
                    />
                    <div
                        className={cn(styles.custom_scrollbars_thumb, styles.custom_scrollbars_thumb_horizontal)}
                        ref={scrollThumbHorizontalRef}
                        onMouseDown={handleThumbMousedownHorizontal}
                        style={{
                            width: `${thumbHorizontalWidth}px`,
                        }}
                    />
                </div>
            </div>

            <div className={cn(styles.custom_scrollbars_scrollbar, styles.custom_scrollbars_scrollbar_vertical)}>
                <div
                    className={cn(styles.custom_scrollbars_track_and_thumb, styles.custom_scrollbars_track_and_thumb_vertical)}
                >
                    <div
                        className={cn(styles.custom_scrollbars_track, styles.custom_scrollbars_track_vertical)}
                        ref={scrollTrackVerticalRef}
                        onClick={handleVerticalTrackClick}
                    />
                    <div
                        className={cn(styles.custom_scrollbars_thumb, styles.custom_scrollbars_thumb_vertical)}
                        ref={scrollThumbVerticalRef}
                        onMouseDown={handleThumbMousedownVertical}
                        style={{
                            height: `${thumbVerticalHeight}px`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
