import $api from '../../../../helpers/axios';
import { ApiManager } from '../ApiManager';

jest.mock('../../../../helpers/axios', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

const createApiManager = (handlers = {}) => {
    const apiManager = new ApiManager({
        DataManager: {},
        metaOwner: 'meta-owner',
        type: 'list',
        method: '',
        options: { limit: 200, offset: 0 },
        element: null,
        ...handlers,
    });

    apiManager.metadata = { routes: 'Guide', id: 'meta-1' };
    return apiManager;
};

describe('ApiManager.UpdateRecords', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('sends one partial-record PUT per record', async () => {
        $api.put.mockResolvedValueOnce({ data: { rows: [1] } }).mockResolvedValueOnce({ data: { rows: [2] } });
        const apiManager = createApiManager();

        const results = await apiManager.UpdateRecords([
            { id: 'row-1', name: 'New' },
            { id: 'row-2', price: 15 },
        ]);

        expect($api.put).toHaveBeenCalledTimes(2);
        expect($api.put).toHaveBeenNthCalledWith(1, '/guide/meta-1', { record: { id: 'row-1', name: 'New' } });
        expect($api.put).toHaveBeenNthCalledWith(2, '/guide/meta-1', { record: { id: 'row-2', price: 15 } });
        expect(results).toHaveLength(2);
    });

    test('accepts a single record', async () => {
        $api.put.mockResolvedValue({ data: {} });
        const apiManager = createApiManager();

        await apiManager.UpdateRecords({ id: 'row-1', name: 'New' });

        expect($api.put).toHaveBeenCalledTimes(1);
        expect($api.put).toHaveBeenCalledWith('/guide/meta-1', { record: { id: 'row-1', name: 'New' } });
    });

    test('skips request when onBeforeSave forbids it', async () => {
        const apiManager = createApiManager({ onBeforeSave: () => false });

        const results = await apiManager.UpdateRecords({ id: 'row-1', name: 'New' });

        expect($api.put).not.toHaveBeenCalled();
        expect(results).toEqual([]);
    });

    test('rejects and reports error through onAfterSave', async () => {
        const error = new Error('server down');
        const onAfterSave = jest.fn();
        $api.put.mockRejectedValue(error);
        const apiManager = createApiManager({ onAfterSave });

        await expect(apiManager.UpdateRecords({ id: 'row-1', name: 'New' })).rejects.toThrow('server down');
        expect(onAfterSave).toHaveBeenCalledWith(apiManager, undefined, error);
    });
});
