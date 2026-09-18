# Компонент `PluginFetchError`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Пояснения к реализации](#implementation-explanation)
3. [Особенности применения](#apply-features)

-   3.1. [Подзаголовок](#example-subheader)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Компонент **PluginFetchError** предназначен для ... <br />

## 2. Пояснения к реализации <a id="implementation-explanation" name="implementation-explanation"></a>

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>

### 3.1. Подзаголовок <a id="example-subheader" name="example-subheader"></a>

## 4. Схема изменений  
```
Было (старая архитектура)               Стало (новая архитектура)
──────────────────────────────────────  ──────────────────────────────────────
extends AdapterSpreadSheetPlugin    ->   extends Plugin<IPluginFetchErrorState>

constructor(args)                   ->   readonly key / readonly initialState
  this.helpers = args.options...    ->   this.options (через _inject)
  this.state = { open: false }      ->   initialState = { open: false }

subscribesEvents() {                ->   appendTransaction():
  subscribeEvent(                   ->     if (type === 'PLUGIN_FETCH_ERROR/EVENT')
    PLUGIN_FETCH_ERROR_EVENT,       ->       return { type: 'PLUGIN_FETCH_ERROR_OPEN',
    this.onError                    ->               payload: errorData }
  )                                 ->
}                                   ->

onError = (data) => {               ->   reducer():
  this.setState(...)                ->     case 'PLUGIN_FETCH_ERROR_OPEN': return { open: true, ...data }
}                                   ->     case 'PLUGIN_FETCH_ERROR_CLOSE': return { ...state, open: false }

render():                           ->   render():
  this.state.open                   ->     this.getState().open
  this.state.message                ->     this.getState().message
  this.helpers                      ->     (this.options as IPluginFetchErrorOptions).helpers
  this.setState((old) => open: v)   ->     dispatch({ type: 'PLUGIN_FETCH_ERROR_CLOSE' })

IPluginFetchErrorOptions (пустой)   ->   IPluginFetchErrorOptions { helpers? }
PluginFetchErrorOptions { helpers } ->   (объединены в один тип)

```
