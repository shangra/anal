import { IColumnGroupItem, IRowGroupItem, IVisibilityFilter } from '../types';

export default class VisibilityFilter implements IVisibilityFilter {
    filterVisibleColumns(colGroups: IColumnGroupItem[]): IColumnGroupItem[] {
        return colGroups.filter((cg) => !(cg.subtotalHidden && cg.isSubtotal));
    }

    filterVisibleRows(rowGroups: IRowGroupItem[]): IRowGroupItem[] {
        const visible: IRowGroupItem[] = [];
        const hiddenKeys = new Set<string>();

        for (const group of rowGroups) {
            if (group.parentKey && hiddenKeys.has(group.parentKey)) {
                hiddenKeys.add(group.key);
                continue;
            }

            if (group.subtotalHidden && group.isSubtotal) {
                hiddenKeys.add(group.key);
                continue;
            }

            visible.push(group);
        }

        return visible;
    }
}
