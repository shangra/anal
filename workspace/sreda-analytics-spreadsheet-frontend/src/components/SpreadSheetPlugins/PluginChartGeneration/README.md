# Компонент `PluginChartGeneration`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Пояснения к реализации](#implementation-explanation)
3. [Особенности применения](#apply-features)
-   3.1. [Подзаголовок](#example-subheader)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Компонент **PluginChartGeneration** предназначен для ... <br />

## 2. Пояснения к реализации <a id="implementation-explanation" name="implementation-explanation"></a>

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>

### 3.1. Подзаголовок <a id="example-subheader" name="example-subheader"></a>


## Схема потока данных  
```
Пользователь выделяет диапазон
        │
        ▼ dispatch(RANGES_SET)
  CorePlugin.reducer          <- обновляет ranges
        │
        ▼ appendTransaction   <- PluginChartGeneration читает PluginCursorCellState.ranges
  _computeChartData()         <- ЕДИНСТВЕННЫЙ вызов parseRangesForChart
        │
        ▼ dispatch(CHART_DATA_UPDATE)
  PluginChartGenerationState.chartData обновлён
        │
        ▼ React re-render
  ChartWindow (usePluginState) <- читает chartData
  useMemo: getLineComputedData <- конвертация 1 раз (было: 1 раз на каждый charts-цикл)
        │
        ▼
  ChartGenerationCMP           <- рендерит график

Изменение ячейки в выделении:
  dispatch(CELLS_SET)
  appendTransaction -> _doesDataOverlapRanges (O(changed_cells × ranges))
  -> если пересечение: dispatch(CHART_DATA_UPDATE) -> тот же путь
  -> если нет: return null (пересчёта нет — оптимизация)

Кнопка «Создать график»:
  canCreate = chartData?.itemsData.length > 0
  -> disabled если данных нет (не нужна проверка length > 1 как в старом коде)
  -> CHART_CREATE -> ChartWindow открывается -> читает chartData из state

```
