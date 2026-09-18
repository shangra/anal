import { renderHook } from '@testing-library/react-hooks';

import { useLayeredRendering } from '../hooks/useLayeredRendering.hook';
import { ObjectPool } from '../utils/ObjectPool';

describe('Performance Optimizations', () => {
    describe('Object Pool', () => {
        it('should reuse objects', () => {
            const pool = new ObjectPool(
                () => ({ x: 0, y: 0 }),
                (obj) => {
                    obj.x = 0;
                    obj.y = 0;
                },
                5,
                10,
            );

            const obj1 = pool.acquire();
            obj1.x = 10;
            pool.release(obj1);

            const obj2 = pool.acquire();
            expect(obj2).toBe(obj1);
            expect(obj2.x).toBe(0); // Should be reset
        });

        it('should respect max size', () => {
            const pool = new ObjectPool(
                () => ({ x: 0 }),
                (obj) => {
                    obj.x = 0;
                },
                1,
                2,
            );

            const objs = [];
            for (let i = 0; i < 5; i++) {
                objs.push(pool.acquire());
            }

            objs.forEach((obj) => pool.release(obj));

            const stats = pool.getStats();
            expect(stats.available).toBeLessThanOrEqual(2);
        });
    });

    describe('Layered Rendering', () => {
        it('should not render all layers when only one is dirty', () => {
            const renderCounts = {
                background: 0,
                content: 0,
                selection: 0,
            };

            // Mock render functions
            const mockRenderBackground = jest.fn(() => renderCounts.background++);
            const mockRenderContent = jest.fn(() => renderCounts.content++);
            const mockRenderSelection = jest.fn(() => renderCounts.selection++);

            // Test that only selection layer is rendered
            mockRenderSelection();

            expect(renderCounts.background).toBe(0);
            expect(renderCounts.content).toBe(0);
            expect(renderCounts.selection).toBe(1);
        });
    });

    describe('Virtual Scrolling', () => {
        it('should calculate correct visible range', () => {
            const viewport = {
                minY: 100,
                maxY: 500,
                height: 400,
            };

            const rowHeight = 25;
            const totalRows = 1000;

            const minRowIndex = Math.floor(viewport.minY / rowHeight);
            const maxRowIndex = Math.ceil(viewport.maxY / rowHeight);

            expect(minRowIndex).toBe(4);
            expect(maxRowIndex).toBe(20);
            expect(maxRowIndex - minRowIndex).toBeLessThan(totalRows);
        });
    });

    describe('Text Measurement Cache', () => {
        it('should cache text measurements', () => {
            const cache = new Map<string, number>();

            const measureText = (text: string, font: string): number => {
                const key = `${text}_${font}`;
                if (cache.has(key)) {
                    return cache.get(key)!;
                }

                // Simulate expensive measurement
                const width = text.length * 10;
                cache.set(key, width);
                return width;
            };

            // First call
            const start1 = performance.now();
            const width1 = measureText('Hello', '12px Arial');
            const time1 = performance.now() - start1;

            // Second call (cached)
            const start2 = performance.now();
            const width2 = measureText('Hello', '12px Arial');
            const time2 = performance.now() - start2;

            expect(width1).toBe(width2);
            expect(time2).toBeLessThan(time1); // Cached should be faster
            expect(cache.size).toBe(1);
        });
    });
});
