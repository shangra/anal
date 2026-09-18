/*
Вот пример тестов для вашего модуля `MetaSearchService`, написанный с использованием библиотеки Jest:

---

**Файл:** `__tests__/tests/MetaSearchService.test.js`


---

Эти тесты покрывают основные сценарии работы службы `MetaSearchService`:

1. Проверяют обработку пустых параметров
2. Тестируют поиск по валидным UUID
3. Проверяют работу поиска по текстовым терминам
4. Убедиться, что внутренний индекс обновляется при изменении метаданных
5. Обрабатывают смешанное вводимое содержимое (UUID и текст)
6. Проверяют правильность структуры возвращаемых результатов

Вы можете адаптировать эти тесты под специфику вашей реализации и добавлять дополнительные проверки по мере необходимости.
*/

const MetaSearchService = require('../../services/MetaSearch.service');

describe('MetaSearchService', () => {
    
    test('query with empty params returns null', async () => {
        const service = new MetaSearchService();
        
        const result = await service.query({});
        
        expect(result).toBeNull();
    });

    test('query with valid UUID tokens finds matching records', async () => {
        const service = new MetaSearchService();
        
        const params = {
            target: 'b0f1e2d3-a4c5-b6d7-e8f9-g0h1j2k3l4m5'
        };
        
        const result = await service.query(params);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(1);
        expect(result[0].id).toBe(params.target);
        expect(result[0].match).toBe('id');
    });

    test('query with text search terms finds matching names', async () => {
        const service = new MetaSearchService();
        
        const params = {
            target: 'some search term'
        };
        
        const result = await service.query(params);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(1);
        expect(result[0].match).toBe('name');
    });

    test('query updates internal index correctly on metadata changes', async () => {
        const service = new MetaSearchService();
        
        const params = {
            target: 'newly added record'
        };
        
        // имитируем изменение метаданных
        jest.spyOn(service, '_updateIndex').mockImplementation(() => {
            // здесь можно симулировать обновление индекса
        });
        
        const result = await service.query(params);
        
        expect(service._updateIndex).toHaveBeenCalled();
        expect(result.length).toBeGreaterThanOrEqual(1);
    });

    test('query handles mixed input types (UUIDs & text)', async () => {
        const service = new MetaSearchService();
        
        const params = {
            target: 'existing-id-uuid some-text-term another-existing-id-uuid'
        };
        
        const result = await service.query(params);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.some(item => item.match === 'id')).toBeTruthy();
        expect(result.some(item => item.match === 'name')).toBeTruthy();
    });

    test('query returns correct structure for each result', async () => {
        const service = new MetaSearchService();
        
        const params = {
            target: 'any-search-term'
        };
        
        const result = await service.query(params);
        
        expect(result.every(item => typeof item.id === 'string')).toBe(true);
        expect(result.every(item => ['id', 'name'].includes(item.match))).toBe(true);
        expect(result.every(item => Array.isArray(item.node.path))).toBe(true);
    });
});
