# Компонент `PluginReports`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Пояснения к реализации](#implementation-explanation)
3. [Особенности применения](#apply-features)
-   3.1. [Подзаголовок](#example-subheader)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Компонент **PluginReports** предназначен для ... <br />

## 2. Пояснения к реализации <a id="implementation-explanation" name="implementation-explanation"></a>

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>

### 3.1. Подзаголовок <a id="example-subheader" name="example-subheader"></a>

## Схема трансформации  
```
Было                                    Стало
──────────────────────────────────────  ──────────────────────────────────────
extends AdapterSpreadSheetPlugin    ->   extends Plugin<IPluginReportsState>

constructor(args)                   ->   _inject(ctx, options)
  this.tableAdapter = args.adapter  ->   this.tableAdapter = new Facade(this)
  this.state = initialState         ->   readonly initialState = { ... }

subscribesEvents() {                ->   appendTransaction():
  subscribeEvent(CLEAR_EVENT, ...)  ->     CLEAR_EVENT -> queueMicrotask(_onClear)
  subscribeEvent(XLSX_LOAD, ...)    ->     XLSX_LOAD   -> queueMicrotask(_onXlsxLoad)
  subscribeEvent(ON_SCROLL, ...)    ->     ON_SCROLL   -> _onScroll (TODO: dispatch)
}

adapterMount()                      ->   onMount()

this.state = { ...this.state,       ->   this.setState(() => ({   <- через wrapper
    isLoading: true                 ->       ...this.getState(),   <- dispatch
};                                  ->       isLoading: true
this.tableAdapter.forceUpdate()     ->   }));  <- dispatch уже вызывает _triggerUpdate

render()                            ->   render() — state через this.getState()
  this.state.isLoading              ->     state.isLoading

export() -> IPluginReportsPluginData ->   export() -> { key: string; state: any }
import(json)                        ->   import({ key, state })
  this.tableAdapter.setRowsCount()  ->     this.tableAdapter.setRowsCount() <- facade

```
