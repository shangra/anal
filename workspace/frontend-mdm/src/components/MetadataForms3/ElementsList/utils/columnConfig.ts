import type { IColumnConfig, IMergedColumns } from '../types'

export function getTableConfigKey(formId: string, name: string): string {
  return `table_columns_${formId}_${name}`
}

export function flattenColumnConfig(
  config: (IColumnConfig | IColumnConfig[])[],
): IColumnConfig[] {
  return config.flatMap((item) => (Array.isArray(item) ? item : [item]))
}

export function syncColumnConfigs(
  currentConfig: (IColumnConfig | IColumnConfig[])[],
  savedConfig: (IColumnConfig | IColumnConfig[])[],
): void {
  savedConfig.forEach((saved, index) => {
    if (index >= currentConfig.length) return
    if (Array.isArray(saved) && Array.isArray(currentConfig[index])) {
      const savedArray = saved
      const currentArray = currentConfig[index]

      savedArray.forEach((savedItem, i) => {
        if (i < currentArray.length) {
          currentArray[i].width = savedItem.width
          currentArray[i].resizable = savedItem.resizable
        }
      })
      return
    }

    if (!Array.isArray(saved) && !Array.isArray(currentConfig[index])) {
      const currentItem = currentConfig[index]
      currentItem.width = saved.width
      currentItem.resizable = saved.resizable
    }
  })
}

export function normalizeFlatConfig(
  flatConfig: IColumnConfig[],
  mergedColumns: IMergedColumns | undefined,
  hasHierarchy: boolean,
): (IColumnConfig | IColumnConfig[])[] {
  const result: (IColumnConfig | IColumnConfig[])[] = []
  const groups = mergedColumns || {}
  let configIndex = 0

  if (hasHierarchy) {
    result.push({
      width: 150,
      resizable: false
    })
  }

  Object.values(groups).forEach((groupConfig) => {
    const groupLength = groupConfig.sourceFields.length
    const groupConfigs = flatConfig.slice(configIndex, configIndex + groupLength)

    result.push(
      groupConfigs.length === groupLength
        ? groupConfigs
        : Array(groupLength).fill({
          width: 200, resizable: true
        }),
    )
    configIndex += groupLength
  })

  for (let i = configIndex; i < flatConfig.length; i++) {
    result.push(flatConfig[i])
  }

  return result
}

export function loadColumnConfig(
  storageKey: string,
  mergedColumns: IMergedColumns | undefined,
  hasHierarchy: boolean,
): (IColumnConfig | IColumnConfig[])[] | null {
  const saved = localStorage.getItem(storageKey)
  if (!saved) return null

  try {
    const parsed = JSON.parse(saved) as unknown

    if (!Array.isArray(parsed))
      return null

    if (parsed.every((item) => !Array.isArray(item))) {
      return normalizeFlatConfig(parsed as IColumnConfig[], mergedColumns, hasHierarchy)
    }

    return parsed as (IColumnConfig | IColumnConfig[])[]
  } catch (error) {
    console.error('Failed to parse column config', error)
    return null
  }
}

export function saveColumnConfig(
  storageKey: string,
  config: (IColumnConfig | IColumnConfig[])[],
): void {
  localStorage.setItem(storageKey, JSON.stringify(flattenColumnConfig(config)))
}
