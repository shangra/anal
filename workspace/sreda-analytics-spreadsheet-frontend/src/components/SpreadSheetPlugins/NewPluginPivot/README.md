# Компонент `NewPluginPivot`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Пояснения к реализации](#implementation-explanation)
3. [Особенности применения](#apply-features)
-   3.1. [Подзаголовок](#example-subheader)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Компонент **NewPluginPivot** предназначен для работы с таблицей для кубов. <br />

## 2. Пояснения к реализации <a id="implementation-explanation" name="implementation-explanation"></a>

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>
Применяется для кубов.
Может работать с иерархией.

### 3.1. Иерархия измерений для кубов <a id="olap-cubes-hierarchy" name="olap-cubes-hierarchy"></a>

## Схема потоков данных новой архитектуры  
```
Пользователь выбирает параметры (MenuIcon)
          │
          ▼
  onClickGetData(args)
          │
          ├─► dispatch({ type: 'PIVOT/SET_ARGS', payload: args })
          │         │
          │         ▼
          │   reducer() -> новый slice-state
          │
          └─► SredaPivotDataManager + PivotTableService.build()
                    │
                    ▼ callback: _renderPivot(pivotTable)
                    │
                    ├─► context.getData().clear()         // мутация dataMatrix
                    ├─► context.styleManager.clear()      // сброс стилей
                    ├─► _createRootButton()               // кнопка настроек
                    ├─► _writeCells(schemaInfoRows, ...)  // строки схемы
                    └─► _writeCells(pivotTable, ...)      // сама таблица
                              │
                              ▼
                    dispatch('CELLS_SET_WITH_STYLE')  ->  тригер React re-render

Внешнее событие (CLEAR_EVENT / XLSX_LOAD_EVENT)
          │
          ▼
  reducer() обрабатывает action.type
          │
          └─► _clearSpreadsheetData() + reset state -> { ...DEFAULT_STATE }

Контекстное меню (правый клик)
          │
          ▼
  AdapterSpreadSheet вызывает plugin.getContextMenuItems(cell) через duck-typing
          │
          └─► возвращает TContextMenuItem[] (drill-down, скрытие субтоталей)

```
