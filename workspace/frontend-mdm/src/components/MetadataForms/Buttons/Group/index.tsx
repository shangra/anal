import { Component, type ReactNode } from 'react'
import { Button } from 'ui-kit'
import { GroupIcon } from './Icon/group.icon'
import { Api } from '../../DataManager/Api.js'
import $windows from '../../../ui/windows.helper'
import { v4 as uuidv4 } from 'uuid'
import type { Props, State } from './types'
import type { GroupingFieldTreeNode } from './types'
import { listSettingsActions } from '../../../../helpers/grouping.helper'
import { setColumnGroupingCatalog } from '../../../../helpers/listSettings/facets/columnGrouping/store'
import { ListSettingsModal } from './ListSettingsModal/ListSettingsModal'
import { IDataColumn } from '../../ElementsList/types'
import { sortSettingsActions } from '../../../../helpers/listSettings/facets/sort/store'

type FieldDataType = 'string' | 'number' | 'date'

function mapRawTypeToFieldDataType(rawType: string | undefined): FieldDataType | undefined {
    if (!rawType) return 'string'
    const normalized = rawType.toLowerCase()
    if (normalized === 'number' || normalized === 'integer' || normalized === 'int' || 
        normalized === 'float' || normalized === 'decimal') {
        return 'number'
    }
    if (normalized === 'date' || normalized === 'datetime' || normalized === 'timestamp') {
        return 'date'
    }
    return 'string'
}
export class Group extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            fields: [],
            loading: false,
        }
    }

    handleClick = async (): Promise<void> => {
        const { DataManager } = this.props
        if (!DataManager) return

        let fields = this.state.fields

        if (fields.length === 0) {
            fields = await this.loadFields()
        }

        const modalUUID = uuidv4()
        $windows.open(
            <div>
                <b>Настройка списка</b>
            </div>,
            <ListSettingsModal
                open
                onClose={() => $windows.close(modalUUID)}
                initialTab="grouping"
                embedded
            />,
            {
                uuid: modalUUID,
                width: 940,
                height: 500,
            },
        )
    }

    async loadFields(): Promise<GroupingFieldTreeNode[]> {
        const { DataManager } = this.props
        if (!DataManager) return []

        this.setState({ loading: true })

        try {
            const res = await Api.fetchFieldsByObject(DataManager.metaOwner)
            if (!res) return []
            const listMeta = DataManager?.meta?.list
            const cols = listMeta?.cols ?? []
            const typeByField = new Map(cols.map((col: IDataColumn) => [col.field, col.type]))

            // Каталог колонок для «Группировки столбцов» берётся из ElementList
            // (видимые колонки списка), а не из полей группировки строк.
            console.log('[ColumnGrouping] DataManager.meta.list?.cols =', listMeta?.cols ?? 'NO meta.list')
            const columnCatalog: GroupingFieldTreeNode[] = cols
                .filter((col: IDataColumn) => col.show)
                .map((col: IDataColumn) => ({
                    id: col.field,
                    label: col.name,
                    value: col.field,
                    isGroupLevel: false,
                    children: [],
                    rawType: col.type,
                }))
            console.log(
                '[ColumnGrouping] columnCatalog (cols shown) length =',
                columnCatalog.length,
                columnCatalog.slice(0, 5),
            )
            setColumnGroupingCatalog(columnCatalog)

            const fields = (res.registryFields ?? [])
                .filter((el) => el.show)
                .map(({ id, label, value }) => ({
                    id,
                    label,
                    value,
                    isGroupLevel: false,
                    children: [],
                    rawType: (typeByField.get(value) as string) ?? undefined,
                }))

            this.setState({ fields })
            listSettingsActions.setAvailableFields(fields)
            
            // Инициализация store сортировки
            sortSettingsActions.setAvailableFields(fields)
            
            // Инициализация типов полей для сортировки
            const fieldTypesMap: Record<string, FieldDataType> = {}
            fields.forEach((field) => {
                const dataType = mapRawTypeToFieldDataType(field.rawType as string)
                if (dataType) {
                    fieldTypesMap[field.value] = dataType
                }
            })
            sortSettingsActions.setFieldTypes(fieldTypesMap)
            
            return fields
        } catch (e) {
            console.error('Ошибка загрузки полей для группировок:', e)
            return []
        } finally {
            this.setState({ loading: false })
        }
    }

    render(): ReactNode {
        const { title } = this.props

        return (
            <Button
                title={title ?? 'Группировки'}
                leftIcon={GroupIcon}
                color="primary"
                onClick={this.handleClick}
            />
        )
    }
}
