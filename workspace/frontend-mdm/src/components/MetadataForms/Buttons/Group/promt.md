Задача: ColumnGroupingTab - группировка столбцов.
UX/ визуальная модель
Иерархия <как папки>:
- Есть корневой узел <Список столбцов> - постоянный, не удаляется.
- Внутри корня лежат столбцы и/или подгруппы.
- Внутри подгруппы можно создавать вложенные группы и перетаскивать туда столбцы.
- Столбец может находиться только в одном месте дерева.
- Слева - те же доступные поля(исключая уже использованные в дереве).

Что нужно реализовать:

1. Модель данных

type NodeKind = "root" | "group" | "column"
interface ColumnGroupNode {
 id: string;
 kind: NodeKing;
 title?: string; // только для груп .. 
 fieldId?: string; // только для column
 children: ColumnGroupNode[]; // только для root/group
 }
 interface GroupSettingsState {
 root: ColumnGroupNode; // kind: 'root', title: "Список столбцов"
}

Инварианты(обеспечивать в actions,не в UI):
-fieldId уникален во всем дереве
- группа нельзя переместить в себя или в своего потомка
- корень всегда сущетсвует и не удаляется
- при удалении групы ее children поднимаются к родителю(или удаляются - выбрать одна поведение и зафиксировать)

Actions:
getGroupSettingsState(): GroupSettingsState|
getUsedFieldIds(): string[] // для excludeFields в левой панели
getFlatVisibleRows(expandedGroupIds): FlatGroupRow[] // DFS-проекция таблицы

createGroup(parentId: string, title?:string,index?:number):string
renameGroup(groupId:string,title:string):void
removeGroups(groupsIds:string[]):void

addColumn(parentId:string,fieldsIds:string[],index?:number):void
removeColumns(fieldsIds:string[]):void

moveNodes(nodeIds: string[],targetParentId:string,index:number):void
reorderNodes(parentId:string,nodeIds:string[],toIndex:number):void

После каждой мутации - bump revision через существующий механизм emitListSettingsRevision

Flat-проекция для UI:
interface FlatGroupRow {
 nodeId: string;
 kind: NodeKind;
 depth: number;
 title: string;
 fieldId?:string;
 parentId: string;
 hasChildren: boolean
}

2. Компонент ColumnGroupingTab

Подписка:
class ColumnGroupingTab extends Component {
 static SUBCRIBER = 'ColumnGroupingTab'

 componentDidMoun() {
  subscribeListSettingsRevision(ColumnGroupingTab.SUBSCRIBER, this.handleRevision)
 }
 componentWillUnmount() {
  unsubcribeListSettingsRevision(ColumnGroupingTab.SUBSCRIBE)
 }

 handleRevision = () => {
  this.syncHighlitedNodes();
  this.forceUpdate()
 }

UI-состояние(ColumnGroupingTab)
interface ColumnGroupingTabState {
 highlitedNodeIds: Set<string>;
 selectionAnchor: string | null;
 
 draggingNodeIds: string[];
 dragSource: 'tree' | 'available-panel' | null;
 dropTarget: { parentId: string, index:number,zone: 'into' | 'before' | 'after' } | null;

 expandedGroupIds: Set<string>;
 isAddFieldsModalOpen: boolean;
 editingGroupId: string | null;
}

syncHiglitedNodes
Аналог syncHighlitedFields: убрать из selection nodeId, которые больше нет в nodeIndex.

3.Композиция render

ColumnGroupingTab:
-AvailableFieldsPanel // переиспользовать; exclude = getUsedFieldsIds()
- <section classname="right-panel>
   -renderGroupd tree()
-AddFieldsModal

renderGroupTree()

FacetsToolbar:
 - Создать группу -> createGroup(selectedParentId || root.id)
 - Удалить -> removeGroups(highlitedGroupIds) / removeColumns
 - Переименовать -> inline edit через EditingGroupId
 Таблица grouping-table:
 - строки из getFlatVisibleRows(expandedGroupIds)
 - отступ по depth(padding: depth * 16)
 - chevron expand/collapse для групп(состояние в UI)
 - Корневая строка <Список столбцов> - не draggable, не selectable как обычная строка, default drop-target

4.Selection

Переиспользовать applyMultiSelect по плоскому списку видимых строк:
- клик -> highlight
- Shift/ctrl/megaselect -> как в SortingTab
- корень исключить из drag/select как перетаскиваемый узел

5. Drag&Drop

переиспользовать паттерн payload:
readGroupingDragPayload() / writeGroupingDragPayload()

Источники drag:
1.Строка дерева -> {nodeIds}
2. Левая панель -> {fieldsIds, source: 'available-panel'}
Drop zones на строке:
-into - внутрь группы(child)
-before/after - reorder среди sibilings

Handlers:
startRowDrag(nodeIds,e)
handleRowDragOver(row,zone,e)
handleRowDrop() {
 if(payload.source === 'available-panel') {
  groupingSettingsAction.addColumn(targetParentId,payload.fieldsIds,index)
 } else {
  groupingSettingsAction.moveNodes(payload.nodeIds, targetParentId, index)
 }
}
moveNodes в сторе:
1.Валидация(нет циклов, нет дубликатов fieldId)
2.Вырезать из старых parents
3.Вставить в targetParentId на index.
4.Emit revision


6.Маппинг UI -> store actions
Создать группу(UI-действие) -> createGroup(parentId)
Создать группу из выделенных столбцов -> createGroup + moveNodes(selectedColumnIds,newGroupId,0)
Добавить поля из модалки -> addColumns(targetParentId,fieldIds)
Dnd reorder / перенос -> moveNodes
Удалить группу -> removeGroups(children -> parent)
Удалить столбец(removeColumns)
Переименовать группу -> renameGroup



Ограничения и требования к реализации:
1. Повторить стиль SortingTab: именования,структура файлов, паттерны подписки,Dnd,selection,toolbar,modal
2.Вся логика дерева - в сторе; UI только вызывает actions и рендерит flat-проекцию
3. Переиспользовать сущетсвующие: AvailableFieldsPanel,FacetsToolbar,applyMultiSelect,revision subscribe, modal pattern, grouping-table из css
4. Persisted settings - только дерево; expand/selection/drag - только UI-state
5. ID Узлов стабльные: group_${uuid} для групп; для column - fieldId или wrapper-id
6. Написать moveNodes с полной валидацией(циклы,duplicate fields,корень)
7.При загрузке persisted state пересобирать nodeIndex.

Ожидаемый результат
1.Новые файлы: store(groupSettingsState, groupSettingsActions),ColumnGroupingTa, типы, dnd payload helpers
2. ColumnGroupingTab интегрирован в существующую систему list settings tabs
3. Работают: создание/удаление/переименование групп, добавление столбцов,dnd между группами,multiselect, модалка добавления, реактивный перерендер через revision
4. Код минимально дублирует SortingTab - общие утилиты вынести при необходимости

Порядок работы:
1. Изучить сущетсвующие SortingTab, store сортировки, revision механизм, dnd helpers
2. Спроектировать и реализовать store группировки стобцов с инвариантами
3. Реализовать ColumnGroupingTab с flat tree table
4. Подклчить dnd и selection
5.Интегрировать в UI настроек списка
6. Проверить сценарии: create group,nest group,drag column into group, drag group into group, delete group(children lif),remove column, add from modal,multiselect + bulk delete

Начни с изучения кодовой базы SortingTab и реализуй ColumnGroupingTab по описанной архитектуре