import { ISubtotalConfig, ISubtotalConfigManager } from '../types';

export default class SubtotalConfigManager implements ISubtotalConfigManager {
    private config: Map<string, ISubtotalConfig> = new Map();

    setSubtotalVisibility(dimensionName: string, axis: 'row' | 'column', hidden: boolean): void {
        const key = this.getKey(dimensionName, axis);
        const existing = this.config.get(key);
        this.config.set(key, {
            dimensionName,
            axis,
            hidden,
            position: existing?.position || 'top',
        });
    }

    setSubtotalPosition(dimensionName: string, axis: 'row' | 'column', position: 'top' | 'bottom'): void {
        const key = this.getKey(dimensionName, axis);
        const existing = this.config.get(key);
        this.config.set(key, {
            dimensionName,
            axis,
            hidden: existing?.hidden || false,
            position,
        });
    }

    isSubtotalHidden(dimensionName: string, axis: 'row' | 'column'): boolean {
        const key = this.getKey(dimensionName, axis);
        return this.config.get(key)?.hidden ?? axis === 'column';
    }

    getSubtotalPosition(dimensionName: string, axis: 'row' | 'column'): 'top' | 'bottom' {
        const key = this.getKey(dimensionName, axis);
        return this.config.get(key)?.position ?? 'top';
    }

    clear(): void {
        this.config.clear();
    }

    exportState(): ISubtotalConfig[] {
        return Array.from(this.config.values());
    }

    importState(config: ISubtotalConfig[]): void {
        this.clear();
        for (const item of config) {
            this.setSubtotalVisibility(item.dimensionName, item.axis, item.hidden);
            this.setSubtotalPosition(item.dimensionName, item.axis, item.position);
        }
    }

    private getKey(dimensionName: string, axis: string): string {
        return `${dimensionName}:->:${axis}`;
    }
}
