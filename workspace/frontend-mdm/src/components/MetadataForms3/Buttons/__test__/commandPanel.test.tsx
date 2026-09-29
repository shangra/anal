/**
 * Тесты §7.2 — командный слой панели должен действовать на N выделенных строк,
 * без fallback на «первую строку» (rows[0]).
 */

// on-change — ESM-пакет вне transformIgnorePatterns; мокаем, чтобы можно было
// загрузить настоящий DataManager без необходимости трансформировать ESM.
jest.mock('on-change', () => (obj) => obj);

jest.mock('../../DataManager/ApiManager', () => {
    const instances = [];
    class MockApiManager {
        constructor() {
            instances.push(this);
            this.MarkDeleted = jest.fn().mockResolvedValue({});
            this.Delete = jest.fn().mockResolvedValue({});
        }
    }
    return { ApiManager: MockApiManager, __instances: instances };
});

jest.mock('../../../FormMetadata', () => ({
    FormMetadata: () => null,
}));

jest.mock('../../../ui/windows.helper.js', () => ({
    default: { open: jest.fn() },
}));

jest.mock('../../../ui/modal.helper.js', () => ({
    default: { show: jest.fn() },
}));

const { DataManager } = require('../../DataManager/index.js');
const { __instances: apiInstances } = require('../../DataManager/ApiManager');

const { Copy } = require('../Copy/index.js');
const { Edit } = require('../Edit/index.js');
const { DeleteMark } = require('../DeleteMark/index.js');
const { Conducting } = require('../Conducting/index.js');

describe('resolveSelectionTargets (DataManager)', () => {
    const makeDM = () => new DataManager({ metaOwner: 'm', options: { type: 'list' } });

    test('возвращает id всех выделенных строк', () => {
        const dm = makeDM();
        dm.selectedRows = [
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B' },
            { id: 'c', name: 'C' },
        ];

        expect(dm.resolveSelectionTargets()).toEqual(['a', 'b', 'c']);
    });

    test('возвращает пустой массив, если ничего не выделено', () => {
        const dm = makeDM();
        dm.selectedRows = [];

        expect(dm.resolveSelectionTargets()).toEqual([]);
    });

    test('не падает при undefined selectedRows', () => {
        const dm = makeDM();
        dm.selectedRows = undefined;

        expect(dm.resolveSelectionTargets()).toEqual([]);
    });
});

describe('calculateDisableState кнопок панели (§7.2)', () => {
    const makeButton = (ButtonClass) => {
        const dm = new DataManager({
            metaOwner: 'm',
            options: { type: 'list' },
        });
        return new ButtonClass({ DataManager: dm, type: 'icon' });
    };

    test('0 выделенных → Delete/Copy/Edit/Conducting disabled', () => {
        const buttons = {
            copy: makeButton(Copy),
            edit: makeButton(Edit),
            deleteMark: makeButton(DeleteMark),
            conducting: makeButton(Conducting),
        };

        Object.values(buttons).forEach((btn) => {
            expect(btn.calculateDisableState([])).toBe(true);
            expect(btn.calculateDisableState(undefined)).toBe(true);
        });
    });

    test('1 выделенный → все четыре команды доступны', () => {
        const selected = [{ id: 'x' }];

        expect(makeButton(Copy).calculateDisableState(selected)).toBe(false);
        expect(makeButton(DeleteMark).calculateDisableState(selected)).toBe(false);
        expect(makeButton(Conducting).calculateDisableState(selected)).toBe(false);
        expect(makeButton(Edit).calculateDisableState(selected)).toBe(false);
    });

    test('3 выделенных → Copy/DeleteMark/Conducting по всему набору, Edit N=1', () => {
        const selected = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

        expect(makeButton(Copy).calculateDisableState(selected)).toBe(false);
        expect(makeButton(DeleteMark).calculateDisableState(selected)).toBe(false);
        expect(makeButton(Conducting).calculateDisableState(selected)).toBe(false);
        expect(makeButton(Edit).calculateDisableState(selected)).toBe(true);
    });
});

describe('DeleteMark применяется ко всему выделению (§7.2)', () => {
    test('выделено 3 строки → ApiManager.MarkDeleted получает id всех трёх', async () => {
        const dm = new DataManager({
            metaOwner: 'm',
            options: { type: 'list' },
        });
        // Последний созданный экземпляр принадлежит текущему DataManager.
        const apiInstance = apiInstances[apiInstances.length - 1];
        const markDeletedSpy = apiInstance.MarkDeleted;

        dm.selectedRows = [
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B' },
            { id: 'c', name: 'C' },
        ];

        await dm.MarkDeleted();

        expect(markDeletedSpy).toHaveBeenCalledTimes(1);
        expect(markDeletedSpy).toHaveBeenCalledWith(['a', 'b', 'c']);
    });
});
