# Компонент `CodeEditorCMP`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Пояснения к реализации](#implementation-explanation)
3. [Особенности применения](#apply-features)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Модуль **CodeEditorCMP** предназначен для редактирования текста, а также имеет расширенный функционал для разработки на JavaScript. <br />
Редактор позволяет подсвечивать синтаксис, есть возможность использовать сниппеты, имеет базовый- и live- autocomplete, а также множество [хоткеев](https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts). <br />
Часть из базовых хоткеев не подключена. Компонент имеет функционал для преобразования `jsx->json` и `json->jsx`. Редактор имеет встроенные темы. <br />
Компонент имеет кнопки для преобразования `jsx->json` и `json->jsx`. Цвет кнопок `jsx` и `json` отображает статус их валидации. <span style="color: green">Зеленый</span> цвет - <span style="color: green">валидация пройдена</span>, <br />
<span style="color: red">красный</span> цвет - <span style="color: red">ошибка валидации</span> формата.

## 2. Пояснения к реализации <a id="implementation-explanation" name="implementation-explanation"></a>

Был использован компонент из внешней библиотеки `react-ace`. Дополнительно добавлен функционал для преобразований `jsx->json` и `json->jsx`. <br />

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>
