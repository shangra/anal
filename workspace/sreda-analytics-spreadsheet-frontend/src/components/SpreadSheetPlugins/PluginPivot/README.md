# Компонент `PluginPivot`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Пояснения к реализации](#implementation-explanation)
3. [Особенности применения](#apply-features)
-   3.1. [Подзаголовок](#example-subheader)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Компонент **PluginPivot** предназначен для работы с таблицей для кубов. <br />

## 2. Пояснения к реализации <a id="implementation-explanation" name="implementation-explanation"></a>

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>
Применяется для кубов.
Может работать с иерархией.

### 3.1. Иерархия измерений для кубов <a id="olap-cubes-hierarchy" name="olap-cubes-hierarchy"></a>
Для того, чтобы раскрывать измерения в кубах по нажатию на бургер или плюс, нужны
- this.history;
- this.historyCache.
Строится хеш (строка) от json-а самой иерархии, который добавляется в массив history и объект historyCache.
Если в массиве есть данные, то берется соответствующий ключ из кеша (при его наличии повторный запрос к api не выполняется).
При изменении данных в фильтрах, удалении полей (строки, колонки) и изменении их расположения this.history и this.historyCache очищаются.

## Схема трансформации  
```
Старая архитектура                     Новая архитектура
─────────────────────────────────────  ─────────────────────────────────────
AdapterSpreadSheetPlugin<O, S>    ->    Plugin<IPluginPivotState>
  this.tableAdapter: IAdapter      ->    this.tableAdapter: PluginPivotAdapterFacade
  this.state                       ->    this.getState()  (+ get state() getter)
  this.setState(updater, cb)       ->    setState(updater, cb) wrapper -> dispatch
  subscribesEvents()               ->    appendTransaction()
  adapterMount()                   ->    onMount()
  render(options)                  ->    render()  (options из this.options)
  export(): IPluginPivotPluginData ->    export(): { key, state: any }
  import(json)                     ->    import({ key, state })
  dropPlugin(args)                 ->    dropPlugin()  (args из this.options)

PluginPivotAdapterFacade (новый)
  .emitEvent()    -> context.dispatch({ type: event, payload })
  .forceUpdate()  -> context.dispatch({ type: 'PIVOT_FORCE_UPDATE' })
  .removeData()   -> matrix.clear() + styleManager.clear()
  .setCellsWithStyle() -> matrix mutation + styleManager
  .insertRow()    -> dispatch(ROW_INSERT)
  .deleteRow()    -> dispatch(ROW_DELETE)
  .getColumnsCount() -> context.getPluginState('core')?.columnsCount
  .updateTableParams() -> dispatch × 4  (заменяет tableAdapter.update())

```
