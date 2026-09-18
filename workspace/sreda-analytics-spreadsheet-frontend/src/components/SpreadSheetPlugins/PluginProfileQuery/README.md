# Компонент `PluginProfileQuery`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Пояснения к реализации](#implementation-explanation)
3. [Особенности применения](#apply-features)

-   3.1. [Подзаголовок](#example-subheader)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Компонент **PluginProfileQuery** предназначен для ... <br />

## 2. Пояснения к реализации <a id="implementation-explanation" name="implementation-explanation"></a>

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>

### 3.1. Подзаголовок <a id="example-subheader" name="example-subheader"></a>

## Схема изменений  
```
Было (старая архитектура)                   Стало (новая архитектура)
──────────────────────────────────────────  ──────────────────────────────────────────
extends AdapterSpreadSheetPlugin        ->   extends Plugin<IPluginProfileQueryState>

state = { explain: false }             ->   initialState = { explain: false,
                                                             requests: [] }

subscribesEvents() {                    ->   appendTransaction():
  subscribeEvent(ON_FETCH_START, ...)  ->     if (isFetchStart && explain):
  subscribeEvent(ON_FETCH_END, ...)    ->       options.explain = true (mutation)
}                                      ->     if (isFetchEnd && explain):
                                       ->       queueMicrotask(fetchExplainData)

onFetchStart({ options }) {            ->   // Та же мутация, но через appendTransaction
    options.explain = true             ->   // synchronously before getRawPivotData()
}                                      ->

onFetchEnd({ data: { answerId } }) {   ->   private async _fetchExplainData():
    $api.get(...)                      ->     $api.get(...)
      .then(res => {                   ->       .then(() => dispatch(
        ProfileWindowRef               ->           PROFILE_QUERY_ADD_REQUEST
        .current.setState(...)  <- ✗   ->       ))
      })                               ->

IPluginProfileQueryState {             ->   IPluginProfileQueryState {
    explain: boolean                   ->       explain: boolean,
}                                      ->       requests: IPluginProfileQueryRequest[]
                                       ->   }

ProfileWindow { state: requests }      ->   ProfileWindow читает requests
ProfileWindowRef -> .setState() <- ✗    ->   через usePluginState() ✓

ButtonPluginRef  (dead code) <- ✗       ->   удалён

class ExplainListGroup                 ->   const ExplainListGroup: FC (функциональный)
class ProfileWindow                    ->   const ProfileWindow: FC (функциональный)

```
