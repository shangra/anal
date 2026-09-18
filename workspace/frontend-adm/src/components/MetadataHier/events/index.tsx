import $windows from 'components/WindowsCMP/windows.helper';
import { handleAddAction } from '../actions/add';
import { getNodeByKey } from '../lib/service';

interface ContextType {
    server: string;
    nodeKey: string;
}

let Components: any;

async function _initialize(_server: string) {
    Components = await import('components/index');
}

function openHelloWindow() {
    $windows.open('Пример', <div>Привет</div>);
}

function openMetadataForm(props: any, ctx: ContextType) {
    const FormMetadata = Components.GetComponent('Components.FormMetadata');
    $windows.open(props.title, <FormMetadata id={props.id} type="list" server={ctx.server} />, {
        uuid: props.id,
    });
}

function openAdd(props: any, ctx: ContextType) {
    const data = getNodeByKey(ctx.server, ctx.nodeKey);
    handleAddAction(data, ctx.server);
}

/**
 * Открывает окно файлового менеджера для узла «Файлы».
 *
 * Используется:
 *  - как обработчик `onDoubleClick` узла `class === 'files'`
 *    (см. `metadata-files/services/metadata/Files.class.js`),
 *  - как action «Открыть файл-менеджер»
 *    (`components/MetadataHier/actions/openFileManager`).
 *
 * Внутри открывает кастомный компонент `AdminUiKit.FileManagerWindow`.
 */
export function openFileManager(props: any, ctx: ContextType) {
    const FileManagerWindow = Components.GetComponent('Components.AdminUiKit.FileManagerWindow');
    if (!FileManagerWindow) {
        console.warn('AdminUiKit.FileManagerWindow не зарегистрирован в Components');
        return;
    }
    const winId = `files-${ctx.nodeKey}`;
    $windows.open(
        props.title ?? 'Файлы',
        <FileManagerWindow
            rootId={props.rootId ?? '00000000-0000-0000-0000-000000000000'}
            server={ctx.server ?? ''}
            title={props.title ?? 'Файлы'}
        />,
        {
            width: '900px',
            height: '600px',
            uuid: winId,
        },
    );
}

export const events = {
    _initialize,
    openHelloWindow,
    openMetadataForm,
    openFileManager,
    openAdd,
};
