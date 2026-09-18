import { useCallback, useContext, useEffect, useRef } from 'react';

import { DPR } from '../const';
import { CanvasSpreadSheetContext } from '../context';
import { animationManager } from '../utils/animationManager';
import type { AnimCache } from '../utils/runAnimation';
import { useBackgroundRendering } from './useBackgroundRendering.hook';
import { useContentRendering } from './useContentRendering.hook';
import { useHeadersRendering } from './useHeadersRendering.hook';
import { useOverlayRendering } from './useOverlayRendering.hook';
import { useSelectionRendering } from './useSelectionRendering.hook';

export const useLayeredRendering = () => {
    const { backgroundRef, contentRef, selectionRef, headersRef, overlayRef, lastupdate, editingCell, rangesStyles, ranges } =
        useContext(CanvasSpreadSheetContext);

    // ─── RAF id для event-driven рендера ─────────────────────────────────────
    const rafId = useRef<number>();

    // ─── Кэш компонентных анимаций (WeakMap, GC-safe) ────────────────────────
    const animCache = useRef<AnimCache>(new WeakMap());

    // ─── Animation-driven перерисовка content ─────────────────────────────────
    //
    // ПОЧЕМУ МИКРОТАСКА, а не updateLayer / новый RAF:
    //
    //   updateLayer делает cancelAnimationFrame(rafId) — убивает pending renderLayers.
    //   Новый RAF из onUpdate вызывался бы внутри animationManager-тика,
    //   т.е. браузер выполнил бы его только в следующем кадре (1 frame lag).
    //
    //   Promise.resolve().then() — микротаска:
    //   • Выполняется ПОСЛЕ всего синхронного кода текущего RAF-тика
    //     (все CanvasAnimation._processFrame уже обновили entry.values)
    //   • Выполняется ДО того, как браузер красит экран
    //   • НЕ трогает rafId — полный рендер renderLayers не отменяется
    //   • Автоматически дебаунсится: сколько бы onUpdate ни сработало
    //     за один тик — перерисовка будет ровно одна
    //
    const pendingAnimRedraw = useRef(false);

    // onRedrawContent передаём в useContentRendering через ref,
    // чтобы runAnimation всегда вызывал актуальную версию
    const onRedrawContentRef = useRef<() => void>(() => {});

    // ─── Canvas helpers ───────────────────────────────────────────────────────
    const clearCanvas = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
        ctx.save();
        ctx.resetTransform();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }, []);

    const setupContext = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.resetTransform();
        ctx.scale(DPR, DPR);
    }, []);

    // ─── Хелпер: отрисовать один слой ────────────────────────────────────────
    const drawLayer = useCallback(
        (
            ref: React.RefObject<HTMLCanvasElement>,
            renderFn: (canvas: HTMLCanvasElement, timestamp?: number) => void,
            alpha: boolean,
            timestamp = 0,
        ) => {
            if (!ref.current) return;
            const ctx = ref.current.getContext('2d', { alpha });
            if (!ctx) return;
            clearCanvas(ref.current, ctx);
            setupContext(ctx);
            renderFn(ref.current, timestamp);
        },
        [clearCanvas, setupContext],
    );

    // ─── Render-хуки ─────────────────────────────────────────────────────────
    const renderBackground = useBackgroundRendering();
    const renderContent = useContentRendering(animCache, onRedrawContentRef);
    const renderSelection = useSelectionRendering();
    const renderHeaders = useHeadersRendering();
    const renderOverlay = useOverlayRendering();

    // Stable refs — анимационные коллбеки всегда вызывают свежую версию
    const renderContentRef = useRef(renderContent);
    const renderSelectionRef = useRef(renderSelection);

    useEffect(() => {
        renderContentRef.current = renderContent;
    }, [renderContent]);
    useEffect(() => {
        renderSelectionRef.current = renderSelection;
    }, [renderSelection]);

    // Пересоздаём при изменении drawLayer (т.е. при изменении clearCanvas/setupContext)
    // — на практике это стабильные функции, пересоздание редкое
    useEffect(() => {
        onRedrawContentRef.current = () => {
            if (pendingAnimRedraw.current) return; // уже запланировано на этот тик
            pendingAnimRedraw.current = true;

            Promise.resolve().then(() => {
                pendingAnimRedraw.current = false;
                drawLayer(contentRef, renderContentRef.current, true, performance.now());
            });
        };
    }, [contentRef, drawLayer]);

    // ─── EVENT-DRIVEN: полный рендер всех слоёв ───────────────────────────────
    const renderLayers = useCallback(() => {
        if (rafId.current) cancelAnimationFrame(rafId.current);

        rafId.current = requestAnimationFrame((timestamp) => {
            const start = performance.now();

            drawLayer(backgroundRef, renderBackground, false, timestamp);
            drawLayer(contentRef, renderContent, true, timestamp);
            drawLayer(headersRef, renderHeaders, true, timestamp);
            drawLayer(selectionRef, renderSelection, true, timestamp);
            drawLayer(overlayRef, renderOverlay, true, timestamp);

            if (localStorage.getItem('DBG_PERF') === '1') {
                const elapsed = performance.now() - start;
                console.log(`🎬 Frame: ${elapsed.toFixed(2)}ms`);
                if (elapsed > 16.67) console.error(`❌ FRAME DROP: ${elapsed.toFixed(2)}ms`);
            }
        });
    }, [
        backgroundRef,
        contentRef,
        headersRef,
        selectionRef,
        overlayRef,
        renderBackground,
        renderContent,
        renderHeaders,
        renderSelection,
        renderOverlay,
        drawLayer,
    ]);

    // ─── ANIMATION-DRIVEN: cursor blink ───────────────────────────────────────
    useEffect(() => {
        if (!editingCell) {
            animationManager.unregister('content-anim');
            return;
        }

        animationManager.register('content-anim', (timestamp) => {
            if (!contentRef.current) return;
            const ctx = contentRef.current.getContext('2d', { alpha: true });
            if (!ctx) return;
            clearCanvas(contentRef.current, ctx);
            setupContext(ctx);
            renderContentRef.current(contentRef.current, timestamp);
        });

        // eslint-disable-next-line consistent-return
        return () => animationManager.unregister('content-anim');
    }, [editingCell, contentRef, clearCanvas, setupContext]);

    // ─── ANIMATION-DRIVEN: marching ants ─────────────────────────────────────
    const hasAnimatedRanges = ranges.some((r) => rangesStyles[r.toString()]?.animated);

    useEffect(() => {
        if (!hasAnimatedRanges) {
            animationManager.unregister('selection-anim');
            return;
        }

        animationManager.register('selection-anim', (timestamp) => {
            if (!selectionRef.current) return;
            const ctx = selectionRef.current.getContext('2d', { alpha: true });
            if (!ctx) return;
            clearCanvas(selectionRef.current, ctx);
            setupContext(ctx);
            renderSelectionRef.current(selectionRef.current, timestamp);
        });

        // eslint-disable-next-line consistent-return
        return () => animationManager.unregister('selection-anim');
    }, [hasAnimatedRanges, selectionRef, clearCanvas, setupContext]);

    // ─── Cleanup ──────────────────────────────────────────────────────────────
    useEffect(
        () => () => {
            if (rafId.current) cancelAnimationFrame(rafId.current);
            animationManager.unregister('content-anim');
            animationManager.unregister('selection-anim');
        },
        [],
    );

    // ─── Триггер по lastupdate ────────────────────────────────────────────────
    useEffect(() => {
        renderLayers();
    }, [lastupdate, renderLayers]);

    // ─── updateLayer ──────────────────────────────────────────────────────────
    const updateLayer = useCallback(
        (layer: 'background' | 'content' | 'selection' | 'headers' | 'overlay') => {
            if (rafId.current) cancelAnimationFrame(rafId.current);

            rafId.current = requestAnimationFrame((timestamp) => {
                const map = {
                    background: { ref: backgroundRef, fn: renderBackground, alpha: false },
                    content: { ref: contentRef, fn: renderContent, alpha: true },
                    selection: { ref: selectionRef, fn: renderSelection, alpha: true },
                    headers: { ref: headersRef, fn: renderHeaders, alpha: true },
                    overlay: { ref: overlayRef, fn: renderOverlay, alpha: true },
                };
                const { ref, fn, alpha } = map[layer];
                drawLayer(ref, fn, alpha, timestamp);
            });
        },
        [
            backgroundRef,
            contentRef,
            selectionRef,
            headersRef,
            overlayRef,
            renderBackground,
            renderContent,
            renderSelection,
            renderHeaders,
            renderOverlay,
            drawLayer,
        ],
    );

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const refresh = useCallback(() => renderLayers(), [renderLayers]);

    const getCanvasContext = useCallback(
        (layer: 'background' | 'content' | 'selection' | 'headers' | 'overlay') => {
            const m = {
                background: backgroundRef,
                content: contentRef,
                selection: selectionRef,
                headers: headersRef,
                overlay: overlayRef,
            };
            return m[layer].current?.getContext('2d') ?? null;
        },
        [backgroundRef, contentRef, selectionRef, headersRef, overlayRef],
    );

    const exportToImage = useCallback(
        (layer: 'background' | 'content' | 'selection' | 'headers' | 'overlay' = 'content') => {
            const m = {
                background: backgroundRef,
                content: contentRef,
                selection: selectionRef,
                headers: headersRef,
                overlay: overlayRef,
            };
            return m[layer].current?.toDataURL('image/png') ?? null;
        },
        [backgroundRef, contentRef, selectionRef, headersRef, overlayRef],
    );

    return {
        renderLayers,
        refresh,
        updateLayer,
        getCanvasContext,
        exportToImage,
        animCache,
        onRedrawContentRef,
    };
};
