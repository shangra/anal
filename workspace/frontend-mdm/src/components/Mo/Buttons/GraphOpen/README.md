# GraphOpen: подключение кнопки графа

Кнопка `GraphOpen` открывает страницу графа для выбранной записи списка.

## 1 Подключение кнопки в шаблоне формы списка

В шаблоне, где есть `MetadataForms.DataManager`, добавьте кнопку в панель контролов:

```jsx
<MetadataForms.DataManager
  metaOwner={[[ metaOwner ]]}
  options={[[ options | encodejson ]]}
>
  <MetadataForms.ControlsPanel>
    <Mo.Buttons.GraphOpen to="list" />
  </MetadataForms.ControlsPanel>

  <MetadataForms.ElementsList name="list" />
</MetadataForms.DataManager>
```


## 2 Шаблон страницы графа (GRAPH)

На странице графа передавайте `id` в `GraphUI` через пропс `graphuiId`.

```jsx
[% import page %]
<Components.HeaderCMP jsonFileName={"/dynpage/settings/main.json"}/>
<div className={"container DesktopContainer"}>
    <GraphUI graphuiId={"[[ page.options.query.id ]]"}/>
</div>
```
