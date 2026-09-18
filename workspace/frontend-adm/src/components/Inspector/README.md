# Модуль `Inspector`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Пояснения к реализации](#implementation-explanation)
3. [Особенности применения](#apply-features)
-   3.1. [Параметры](#params)
-   3.2. [Объявление и использование параметров](#declare-and-use-params)
-   3.3. [Функции для работы с параметрами](#param-functions)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Модуль `Inspector` предназначен для вывода инспектора объектов. Он состоит из формы редактирования и дополнительных элементов (поиск, кнопки, кнопки сохранения).

Особенности:
- Динамическая генерация форм, динамическая подгрузка компонентов
- Поддержка вложенности
- Поддержка динамически генерируемых кнопок

Модуль динамически генерирует форму из шаблона, позволяет редактировать данные и по нажатию кнопки "Сохранить" возвращает состояние формы.

## 2. Пояснения к реализации <a id="implementation-explanation" name="implementation-explanation"></a>

Инспектор поддерживает следующие типы данных для полей: LIST, STRING, INTEGER, BOOL, DATE, DATETIME, TEXT, JSON, REF, GREF, COMPOSITE.

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>

### 3.1. Параметры <a id="params" name="params"></a>

Компонент принимает параметры `formData`, `node` и `onSave`.

`formData` - данные для генератора форм.

Пример данных:

```JSON
{
    "form": [
        {
            "component": "MetadataUiKit.Tabs",
            "props": {
                "tabs": [
                    {
                        "name": "Основное",
                        "content": [
                            {
                                "name": "table",
                                "description": "Имя таблицы",
                                "type": "STRING",
                                "template": "test_table"
                            },
                            {
                                "name": "hierarchical",
                                "description": "Иерархия",
                                "type": "BOOL",
                                "template": "false"
                            },
                            {
                                "name": "formelement",
                                "description": "Форма справочника",
                                "type": "REF",
                                "useParent": false,
                                "link": {
                                    "type": "local",
                                    "metalink": [
                                        "20901b97-d1cf-4472-a27b-b0442e436c9a",
                                        "0cb5c67e-6ad1-4a68-874e-b61ab4118e2a"
                                    ]
                                }
                            },
                        ]
                    },
                    {
                        "name": "Код на сервере",
                        "content": [
                            {
                                "component": "FullscreenViewer",
                                "props": {
                                    "style": {
                                        "height": "500px"
                                    }
                                },
                                "children": [
                                    {
                                        "component": "MetadataUiKit.CodeArea",
                                        "props": {
                                            "key": "codeserver",
                                            "name": "codeserver",
                                            "showToolbar": false,
                                            "subKey": "form"
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        },
        {
            "name": "ReplicationConnector",
            "description": "Коннектор репликации",
            "type": "REF",
            "useParent": false,
            "link": "cce0463c-2dd3-4ee2-aef0-4b83c9c29970"
        },
        {
            "name": "rls",
            "description": "Включить RLS на таблице",
            "type": "BOOL",
            "default": false
        }
    ],
    "buttons": [
        {
            "name": "Load DB model",
            "component": "DBModelLoader",
            "props": {
                "type": "update",
                "server": "mdm",
                "service": "guide/autofill/1858caf2-b845-4175-9463-b1da250914e1"
            }
        },
        {
            "name": "MetaCopy",
            "component": "MetaCopyPaste",
            "props": {
                "type": "copy",
                "server": "mdm",
                "service": "metadata/metacopypaste/copy/1858caf2-b845-4175-9463-b1da250914e1",
                "title": "Скопировать данные объекта метаданных"
            }
        },
    ],
    "manifest": {
        "name": "КритерииНавигатор",
        "description": "Критерии навигатор"
    },
}
```

- `form` - данные для форм. Поддерживает как "простые" компоненты, так и сложные (состоящие из нескольких вложенных компонентов). Указывается массив из следующих данных:
  - `component` - имя компонента
  - `props` - пропсы этого компонента
  - Поле имеет следующие параметры:
  - `description` - описание поля в форме
  - `name` - внутреннее имя поля, по которому возможно обратиться к полю
  - `type` - один из типов полей (см. "Пояснения к реализации").
  - Некоторые компоненты требуют отдельных полей, некоторые могут принимать их.
  - `data` - набор значений в формате `{"ключ": "значение"}`, где ключ соответствует полю с соответствующим значением `name`.
  - `type` - если `"update"` - то отправляется запрос PUT, а если нет, то POST.
  - `buttons` - массив кнопок. Значения:
    - `name` - имя кнопки.
    - `component` - компонент, что будет загружаться из `Inspector.Buttons.*`. Для загрузки компонентов из папки `components` поставьте тильду перед названием, например `~SuperLoaderButton`.
    - `props` - параметры конкретного компонента.
  - `manifest` - наименование и описание объекта.

`node` - это информация о текущей ноде вида:

```TypeScript
interface Node {
    id: string;
    name: string;
    description: string;
    crud: string[];
    needToLoading: boolean;
    ownerId: string | null;
    classId: string | null;
    class: string | null;
    routes: string | null;
}
```

Параметр `onSave` принимает функцию, у которой первый аргумент  - объект значений формы, а второй - это функция `afterSave`.

Вызовите функцию `afterSave` после успешного сохранения, чтобы зафиксировать новые значения в форме после сохранения. Нажатие кнопки "Сбросить изменения" приведёт к сбросу к *сохранённым* значениям. Функция опционально принимает единственным аргументом объект новых значений.

### 3.2. Дополнительные параметры для некоторых типов полей

### STRING

Имеет дополнительный параметр `nullable`. Если отмечено true, то около поля появляется галочка, при нажатии на которую поле принимает значение NULL.

### REF и GREF

Они требуют для себя ссылочный объект `link` (id либо определённый объект):
- `type` - `local` или `global`
- `metalink` - массив пути к справочнику.