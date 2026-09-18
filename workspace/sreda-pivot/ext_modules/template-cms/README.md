# Модуль `template-cms`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Пояснения к реализации](#implementation-explanation)
3. [Особенности применения](#apply-features)

-   3.1. [Типы параметров](#param-types)
-   3.2. [Объявление и использование параметров](#declare-and-use-params)
-   3.3. [Функции для работы с параметрами](#param-functions)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Модуль **template-cms** предназначен для обработки шаблонов. Шаблон - это статичный template, в который вставляется динамическая информация на стороне backend c помощью модуля [page-cms](../page-cms/README.md).
Модуль имеет функционал парсинга шаблонов, генерации параметров страниц (через которые можно вставлять динамические значения на бекенде), <br />
копирования и редактирование информации и кода шаблона. Подход отличается от SSR (Server Side Rendering) тем, что сочетает в себе динамичность и простоту SSR, <br />
и, в тоже время, является SPA-подходом, так как на frontend попадают скрипты, а вместо обычного HTML может быть React-верстка. <br />

## 2. Пояснения к реализации <a id="implementation-explanation" name="implementation-explanation"></a>

Для обеспечения безопасности в модуле установлен запрет на удаление корневого шаблона, относительно которого строится структура шаблонов. <br />
На удаление шаблонов реализован механизм markdel - вместо полного удаления из базы шаблон лишь помечается на удаление и может быть восстановлен. <br />
В шаблонах реализовано ограничение на имена - нельзя создать на одном уровне два шаблона с одинаковым именем. <br />
Конфликты имен между удаленными и создаемыми шаблонами модуль не просматривает. <br />
При создании/сохранении шаблона перезаписываются параметры шаблонов, для них также действует механизм markdel. <br />

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>

### 3.1. Типы параметров <a id="param-types" name="param-types"></a>

Типы параметров регулируются таблицей ParamTypes:

1. number (число)
2. pages (ссылка на страницу)
3. filelink (ссылка на файл)
4. editorjs (HTML, вставками открытие контента в редакторе)
5. bool (логический тип)
6. system (системный параметр - проброс переменных окружения страницы)
7. json (json)
8. javascript (javascript)
9. text (текст)
10. date (дата)
11. html (HTML, открытие редактора)

<div style="border-left: 2px solid white; padding-left: 10px;">
    <span style="color: red">Пояснения к работе JavaScript в параметрах</span> <br />
    Для исполнения JavaScript в скрипте параметра типа `<code>javascript</code>` используется виртуальная машина NodeJS `<code>vm</code>` <br />
    Для нее можно задать контекст исполнения, который задается в сервисе `<code>PagesUI</code>` модуля `<code>page-cm</code>` <br />
    К контексту в скрипте параметра можно обратиться через `<code>this</code>`, в котором будут следующие поля: <br />
    <pre><code>{
    context,
    global: {
        sessionStorage,
    },
    process: {
        env,
    },
    page,
    options: pageOptions,
    require,
}</code></pre>
    В sessionStorage содержится информация о пользователе, его ролях, группах и т.д в поле user. <br />
    В поле `<code>page</code>` находится информация о странице, в контексте которой исполняется шаблон. <br />
    В поле `<code>context</code>` находится информация о текущем контексте. <br />
    <code>Best-practice</code> является извлечение информации о пользователе именно таким образом (без использования стейтов frontend). <br />
    В скриптах возвращаемым значением может быть любой тип. Возврат производится через <code>return</code> конструкцию.
</div>

### 3.2. Объявление и использование параметров <a id="declare-and-use-params" name="declare-and-use-params"></a>

Параметры генерируются на основе нескольких регулярных выражений на: [получение значения параметра](#regexp-get-param-value), [обращение к свойству параметра](#regexp-param-obj-property), [параметр в if блоке](#regexp-if-param), <br />
[параметр в for блоке](#regexp-for-param), [инициализация параметра](#regexp-initialize-param), [объявление параметра через импорт](#regexp-declare-by-import). <br />
Задача рендера страницы (вставки и обработки параметров, парсинга if/for-конструкций и другого) лежит на сервисе [PagesUI](../page-cms/services/PagesUi.service.js) модуля [page-cms](../page-cms/README.md). Реализация функционала рендере лежит на библиотеке `LitePattern`. <br />

#### <u>Получение значения параметра</u> <a id="regexp-get-param-value" name="regexp-get-param-value"></a>

Синтаксис объявления параметра c именем `someParam`:

```
[[ someParam ]]
```

<br />

#### <u>Обращение к свойству параметра</u> <a id="regexp-param-obj-property" name="regexp-param-obj-property"></a>

Синтаксис обращения к свойству id параметра c именем `someParam`:

```
[[ someParam.id ]]
```

<br />

#### <u>Параметр в if блоке</u> <a id="regexp-if-param" name="regexp-if-param"></a>

Конструкция ниже позволяет обрезать по условию строки верстки и не присылать их на frontend. В шаблонах поддерживается также условный рендеринг в синтаксисе `React`. Разница - при условном рендеринге React-ом все стрóки кода <span style="color: red">попадают и рендерятся на frontend</span> в отличие от первого случая.

Синтаксисы if блока c обращением к `someParam`:

```
[% if ([[ someParam ]] !== 'true') %]
...
[% endif %]
```

```
[% if ([[ someParam ]] !== 'true') %]
...
[% else %]
...
[% endif %]
```

<br />

#### <u>Параметр в for блоке</u> <a id="regexp-for-param" name="regexp-for-param"></a>

For-блок позволяет проитерироваться по значениям массива и через обращение к параметру получить значение массива на текущей итерации. <br />

Синтаксис for блока c обращением к `someParam`:

```
[% for (someParam of this.fileList) %]
    <div>{[[ someParam ]]}</div>
[% endfor %]
```

<br />

#### <u>Инициализация параметра</u> <a id="regexp-initialize-param" name="regexp-initialize-param"></a>

Инициализация параметра позволяет создать и сразу проинициализировать параметр, который будет доступен как в скриптах, так и в шаблонах. <br />
Например, это может использоваться для шеринга констант или других значений между скриптами и шаблонами. <br />

Синтаксис блока инициализации c обращением к `someParam`:

```
[% let someParam = getSVGFiles %]
```

<br />

#### <u>Объявление параметра через импорт</u> <a id="regexp-declare-by-import" name="regexp-declare-by-import"></a>

Объявление параметра через явный импорт в верхней части шаблона. Является `best-practice` для параметров. Позволяет объявить параметр, <br />
который используется <span style="color: red">только в теле скрипта</span> (если попробовать объявить параметр в скрипте как синтаксисом "[[someParam]]" - параметр не будет сгенерирован). <br />

Синтаксис import блока c обращением к `someParam`:

```
[% import someParam %]
```

<br />

### 3.3. Функции для работы с параметрами <a id="param-functions" name="param-functions"></a>

В качестве параметра может быть получен любой тип данных. Для обработки параметров существует несколько функций, которые можно использовать прямо при обращении к параметру

<div style="border-left: 2px solid white; padding-left: 10px;">
    <span style="color: red">Важно!</span> <br />
    Для обработки параметра используется специальный синтаксис (например, для параметра <code>someParam</code> и функции <code>encodejson</code>): <br />
    <pre><code class="language-javascript">[[ someParam | encodejson ]]</code></pre> <br />
    Список функций встроенных функций для обработки значения параметра страницы: <br />
    <br />
    1. <code style="color: green">decode</code> - выполняет <code>decodeURIComponent()</code> - декодирует URI
    <br />
    2. <code style="color: green">decodejson</code> - выполняет <code>JSON.parse()</code> - преобразовывает строку в json-object
    <br />
    3. <code style="color: green">encode</code> - выполняет <code>encodeURIComponent()</code> - кодирует URI
    <br />
    4. <code style="color: green">encodejson</code> - выполняет <code>JSON.stringify()</code> - преобразовывает json-объект в строку
    <br />
    5. <code style="color: green">index</code> - выполняет <code>require()</code> для всех файлов в переданной директории кроме `index.js` и возвращает объект, где ключ - название функции, значение - сама функция
    <br />
    6. <code style="color: green">split</code> - выполняет <code>split()</code> - разбивает строку на массив по символу-разделителю
    <br />
    7. <code style="color: green">join</code> - выполняет <code>join()</code> - объединяет элементы массива с добавлением символа-разделителя
    <br />
    8. <code style="color: green">uppercase</code> - выполняет <code>toUpperCase</code> - приводит все символы к заглавным
    <br />
    9. <code style="color: green">lowercase</code> - выполняет <code>toLowerCase()</code> - приводит все символы к строчным
    <br />
</div>
