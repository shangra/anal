export class Profiler {
    private measurements = new Map<string, number[]>();

    private activeTimers = new Map<string, number>();

    start(label: string): void {
        this.activeTimers.set(label, performance.now());
    }

    end(label: string): number {
        const startTime = this.activeTimers.get(label);
        if (!startTime) {
            console.warn(`No active timer for label: ${label}`);
            return 0;
        }

        const duration = performance.now() - startTime;
        this.activeTimers.delete(label);

        if (!this.measurements.has(label)) {
            this.measurements.set(label, []);
        }
        this.measurements.get(label)!.push(duration);

        // Keep only last 100 measurements
        const measurements = this.measurements.get(label)!;
        if (measurements.length > 100) {
            measurements.shift();
        }

        return duration;
    }

    getStats(label: string) {
        const measurements = this.measurements.get(label) || [];
        if (measurements.length === 0) {
            return null;
        }

        const sorted = [...measurements].sort((a, b) => a - b);
        const sum = measurements.reduce((a, b) => a + b, 0);

        return {
            count: measurements.length,
            avg: sum / measurements.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
        };
    }

    getAllStats() {
        const stats: Record<string, any> = {};
        this.measurements.forEach((_, label) => {
            stats[label] = this.getStats(label);
        });
        return stats;
    }

    reset(label?: string): void {
        if (label) {
            this.measurements.delete(label);
            this.activeTimers.delete(label);
        } else {
            this.measurements.clear();
            this.activeTimers.clear();
        }
    }

    report(): void {
        console.table(this.getAllStats());
    }
}

// Глобальный экземпляр
export const profiler = new Profiler();

// Декоратор для профилирования функций
export function profile(label?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        const profileLabel = label || `${target.constructor.name}.${propertyKey}`;

        descriptor.value = function (...args: any[]) {
            profiler.start(profileLabel);
            const result = originalMethod.apply(this, args);
            profiler.end(profileLabel);
            return result;
        };

        return descriptor;
    };
}

// Использование:
// import { profiler, profile } from './utils/profiler';
//
// class MyRenderer {
//     @profile('renderCells')
//     renderCells() {
//         // ...
//     }
// }
//
// // В консоли:
// profiler.report();
