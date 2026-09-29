import { ListFieldDataType, normalizeListFieldDataType, type ListFieldDescriptor } from './types'
import type { GroupingFieldTreeNode } from '../../../components/MetadataForms/Buttons/Group/ListSettingsModal/shared/types'
import { getCatalogFields } from '../../grouping.helper'

export function listFieldCatalog(): ListFieldDescriptor[] {
    return getCatalogFields().map((field: GroupingFieldTreeNode) => ({
        value: field.value,
        label: field.label,
        dataType: normalizeListFieldDataType(field.rawType),
    }))
}

export function getFieldDescriptor(
    fieldValue: string,
): ListFieldDescriptor | undefined {
    return listFieldCatalog().find((field) => field.value === fieldValue)
}

export function getFieldLabel(fieldValue: string): string {
    return getFieldDescriptor(fieldValue)?.label ?? fieldValue
}

export function getFieldDataType(fieldValue: string): ListFieldDataType {
    return getFieldDescriptor(fieldValue)?.dataType ?? 'unknown'
}
