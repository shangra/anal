import type { IColumnData } from '../ReactWindowWrapperCombined/types'
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

export function applyColumnConfigToCols(
  cols: (IColumnData | IColumnData[])[],
  saved: (IColumnConfig | IColumnConfig[])[] | null,
  hasHierarchy: boolean,
): (IColumnData | IColumnData[])[] {
  if (!saved?.length) return cols

  const configs =
    hasHierarchy && saved.length === cols.length + 1 ? saved.slice(1) : saved

  return cols.map((col, index) => {
    const cfg = configs[index]
    if (!cfg) return col

    if (Array.isArray(col)) {
      const leafCfgs = Array.isArray(cfg) ? cfg : [cfg]
      const totalWidth = Array.isArray(cfg)
        ? cfg.reduce((sum, item) => sum + (item.width || 0), 0)
        : cfg.width
      const leafCount = col.length || 1
      const fallbackWidth = totalWidth ? Math.round(totalWidth / leafCount) : undefined

      const next = col.map((leaf, leafIndex) => {
        const width = leafCfgs[leafIndex]?.width ?? fallbackWidth
        return width ? { ...leaf, cellWidth: width } : leaf
      }) as typeof col
      if ('title' in col) {
        (next as { title?: string }).title = (col as { title?: string }).title
      }
      if ('orientation' in col) {
        (next as { orientation?: string }).orientation = (col as { orientation?: string }).orientation
      }
      return next
    }

    if (Array.isArray(cfg)) {
      const width = cfg.reduce((sum, item) => sum + (item.width || 0), 0)
      return width ? { ...col, cellWidth: width } : col
    }

    return cfg.width ? { ...col, cellWidth: cfg.width } : col
  })
}

export function columnsMetadataToConfig(
  cols: (IColumnData | IColumnData[])[],
  metadata: { width: number }[],
): (IColumnConfig | IColumnConfig[])[] {
  return cols.map((col, index) => {
    const width = metadata[index]?.width ?? 200
    if (Array.isArray(col)) {
      const leafCount = Math.max(col.length, 1)
      const part = Math.max(1, Math.round(width / leafCount))
      return col.map(() => ({ width: part, resizable: true }))
    }
    return { width, resizable: true }
  })
}
