/*
    Компонент для управления данными в окне, эвенты которые доступны:

    # Таблица обработчиков событий формы (для примера)
    |---------------------------------------------------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|
    | Имя события                                       | Название на русском                                               | Описание                                                                                                      |
    |---------------------------------------------------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|
    | OnCreateAtServer                                  | ПриСозданииНаСервере                                              | Вызывается при создании формы на сервере, до её открытия. Можно отказаться от создания.                       |
    | OnOpen                                            | ПриОткрытии                                                       | Вызывается при открытии формы, до её показа.                                                                  |
    | OnReopen                                          | ПриПовторномОткрытии                                              | Вызывается при попытке открыть уже открытую форму.                                                            |
    | BeforeClose                                       | ПередЗакрытием                                                    | Вызывается перед закрытием формы. Можно отказаться от закрытия или отменить стандартную обработку закрытия.   |
    | OnClose                                           | ПриЗакрытии                                                       | Вызывается при закрытии формы. Отказаться от закрытия нельзя.                                                 |
    | ChoiceProcessing                                  | ОбработкаВыбора                                                   | Обработка выбора или подбора. Вызывается при выборе значения в подчинённой форме.                             |
    | NotificationProcessing                            | ОбработкаОповещения                                               | Обработка оповещения. Вызывается при вызове метода Оповестить.                                                |
    | ActivationProcessing                              | ОбработкаАктивизации                                              | Вызывается для оповещения об изменении активного объекта во владельце формы.                                  |
    | NewWriteProcessing                                | ОбработкаЗаписиНового                                             | Вызывается для оповещения о записи нового объекта в другой форме.                                             |
    | OnReadAtServer                                    | ПриЧтенииНаСервере                                                | Вызывается после чтения объекта на сервере.                                                                   |
    | BeforeWrite                                       | ПередЗаписью                                                      | Вызывается перед записью объекта на клиенте. Можно отменить запись.                                           |
    | BeforeWriteAtServer                               | ПередЗаписьюНаСервере                                             | Вызывается перед записью объекта на сервере. Можно отменить запись.                                           |
    | OnWriteAtServer                                   | ПриЗаписиНаСервере                                                | Вызывается после записи объекта на сервере, но в одной с ним транзакции.                                      |
    | AfterWriteAtServer                                | ПослеЗаписиНаСервере                                              | Вызывается после записи объекта на сервере и после завершения транзакции.                                     |
    | AfterWrite                                        | ПослеЗаписи                                                       | Вызывается после записи объекта на клиенте и после завершения транзакции.                                     |
    | FillCheckProcessingAtServer                       | ОбработкаПроверкиЗаполненияНаСервере                              | Вызывается при проверке заполнения формы на сервере.                                                          |
    | ExternalEvent                                     | ВнешнееСобытие                                                    | Обработка события от внешнего компонента.                                                                     |
    | AddInDetachmentOnError                            | ОтключениеВнешнейКомпонентыПриОшибке                              | Обработка события аварии внешнего компонента.                                                                 |
    | OnSaveDataInSettingsAtServer                      | ПриСохраненииДанныхВНастройкахНаСервере                           | Вызывается при сохранении данных в настройках на сервере.                                                     |
    | BeforeLoadDataFromSettingsAtServer                | ПередЗагрузкойДанныхИзНастроекНаСервере                           | Вызывается перед загрузкой данных из настроек на сервере.                                                     |
    | OnLoadDataFromSettingsAtServer                    | ПриЗагрузкеДанныхИзНастроекНаСервере                              | Вызывается при загрузке данных из настроек на сервере.                                                        |
    | URLProcessing                                     | ОбработкаНавигационнойСсылки                                      | Вызывается при нажатии гиперссылки форматированной строки.                                                    |
    | URLGetProcessing                                  | ОбработкаПолученияНавигационнойСсылки                             | Вызывается при...                                                                                             |
    | URLListGetProcessing                              | ОбработкаПолученияСпискаНавигационныхСсылок                       | Вызывается при...                                                                                             |
    | NavigationProcessing                              | ОбработкаПерехода                                                 | Вызывается при выполнении перехода перед позиционированием в списке.                                          |
    | ValueChoice                                       | ВыборЗначения                                                     | Вызывается в режиме выбора перед закрытием формы.                                                             |
    | OnChangeDisplaySettings                           | ПриИзмененииПараметровЭкрана                                      | Вызывается при изменении параметров экрана.                                                                   |
    | CollaborationSystemUsersAutoComplete              | АвтоПодборПользователейСистемыВзаимодействия                      | Вызывается при выполнении автоподбора получателя сообщения.                                                   |
    | CollaborationSystemUsersChoiceFormGetProcessing   | ОбработкаПолученияФормыВыбораПользователейСистемыВзаимодействия   | Вызывается при получении формы выбора получателя сообщения.                                                   |
    | OnMainServerAvailabilityChange                    | ПриИзмененииДоступностиОсновногоСервера                           | Вызывается при изменении доступности основного сервера.                                                       |
    | BeforeReopenFromOtherServer                       | ПередПереоткрытиемСДругогоСервера                                 | Вызывается перед переоткрытием формы.                                                                         |
    | OnReopenFromOtherServer                           | ПриПереоткрытииСДругогоСервера                                    | Вызывается при переоткрытии формы.                                                                            |
    | OnClientApplicationSuspend                        | ПриЗасыпанииКлиентскогоПриложения                                 |                                                                                                               |
    | OnClientApplicationResume                         | ПриПробужденииКлиентскогоПриложения                               |                                                                                                               |
    |---------------------------------------------------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|

*/

export class FormHandler {
    constructor() {
        // Конструктор пока пустой, тут можно добавлять инициализацию переменных и свойств
    }

    async onCreateAtServer() {
        console.log('Форма создана на сервере');
    }

    async onOpen() {
        console.log('Форма открыта');
    }

    async onReopen() {
        console.log('Форма повторно открыта');
    }

    async beforeClose() {
        console.log('Форма закрывается...');
    }

    async onClose() {
        console.log('Форма закрыта');
    }

    async choiceProcessing(value) {
        console.log(`Выбор обработан: ${value}`);
    }

    async notificationProcessing(message) {
        console.log(`Оповещение получено: ${message}`);
    }

    async activationProcessing() {
        console.log('Объект активирован');
    }

    async newWriteProcessing() {
        console.log('Новый объект записан');
    }

    async onReadAtServer(data) {
        console.log(`Данные прочитаны на сервере: ${data}`);
    }

    async beforeWrite() {
        console.log('Подготовка к записи на клиенте');
    }

    async beforeWriteAtServer() {
        console.log('Подготовка к записи на сервере');
    }

    async onWriteAtServer() {
        console.log('Запись выполнена на сервере');
    }

    async afterWriteAtServer() {
        console.log('Запись успешно завершена на сервере');
    }

    async afterWrite() {
        console.log('Запись успешно завершена на клиенте');
    }

    async fillCheckProcessingAtServer() {
        console.log('Проверкa заполненности формы выполнена на сервере');
    }

    async externalEvent(eventName) {
        console.log(`Внешнее событие произошло: ${eventName}`);
    }

    async addInDetachmentOnError(errorMessage) {
        console.error(`Ошибка внешней компоненты: ${errorMessage}`);
    }

    async onSaveDataInSettingsAtServer(settings) {
        console.log(`Настройки сохранены на сервере: ${settings}`);
    }

    async beforeLoadDataFromSettingsAtServer() {
        console.log('Начало загрузки настроек с сервера');
    }

    async onLoadDataFromSettingsAtServer(settings) {
        console.log(`Настройки загружены с сервера: ${settings}`);
    }

    async urlProcessing(url) {
        console.log(`Обработана навигационная ссылка: ${url}`);
    }

    async urlGetProcessing(url) {
        console.log(`Получение навигационной ссылки: ${url}`);
    }

    async urlListGetProcessing(urls) {
        console.log(`Получение списка навигационных ссылок: ${urls.join(', ')}`);
    }

    async navigationProcessing(destination) {
        console.log(`Выполнен переход: ${destination}`);
    }

    async valueChoice(selectedValue) {
        console.log(`Выбранное значение: ${selectedValue}`);
    }

    async onChangeDisplaySettings(newSettings) {
        console.log(`Экранные настройки изменились: ${newSettings}`);
    }

    async collaborationSystemUsersAutoComplete(userInput) {
        console.log(`Автоподбор пользователей системы взаимодействия выполнен: ${userInput}`);
    }

    async collaborationSystemUsersChoiceFormGetProcessing(formData) {
        console.log(`Форма выбора получателей сообщения обработана: ${formData}`);
    }

    async onMainServerAvailabilityChange(isAvailable) {
        if (isAvailable) {
            console.log('Основной сервер доступен');
        } else {
            console.log('Основной сервер недоступен');
        }
    }

    async beforeReopenFromOtherServer() {
        console.log('Переоткрытие формы с другого сервера...');
    }

    async onReopenFromOtherServer() {
        console.log('Форма переоткрыта с другого сервера');
    }

    async onClientApplicationSuspend() {
        console.log('Клиентское приложение приостановлено');
    }

    async onClientApplicationResume() {
        console.log('Клиентское приложение возобновило работу');
    }
}
