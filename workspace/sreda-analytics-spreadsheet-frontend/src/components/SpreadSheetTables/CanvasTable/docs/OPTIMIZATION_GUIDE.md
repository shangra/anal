# Canvas Spreadsheet - Руководство по оптимизации

## Основные принципы

### 1. Слоистый рендеринг
Таблица использует 5 отдельных canvas-слоев:
- **Background**: Фон ячеек и сетка (редко обновляется)
- **Content**: Текст и компоненты (обновляется при изменении данных)
- **Selection**: Выделение ячеек (часто обновляется)
- **Headers**: Заголовки строк/колонок (обновляется при прокрутке)
- **Overlay**: Временные элементы (resize guides, drag indicators)

**Правило**: Обновляйте только измененные слои.

### 2. Виртуализация
Рендерятся только видимые ячейки + небольшой буфер (overscan).

```typescript
// Плохо
data.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
        renderCell(cell, rowIndex, colIndex);
    });
});

// Хорошо
for (let row = minVisibleRow; row <= maxVisibleRow; row++) {
    for (let col = minVisibleCol; col <= maxVisibleCol; col++) {
        renderCell(data[row][col], row, col);
    }
}
```
**3. Batch Rendering**  
Группируйте одинаковые операции рисования.
```typescript
// Плохо
cells.forEach(cell => {
    ctx.fillStyle = cell.color;
    ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
});

// Хорошо
const cellsByColor = groupBy(cells, 'color');
cellsByColor.forEach((cells, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    cells.forEach(cell => ctx.rect(cell.x, cell.y, cell.width, cell.height));
    ctx.fill();
});
```
**4. Кэширование**  

Кэшируйте дорогие вычисления:
* Измерения текста  
* Градиенты  
* Вычисленные размеры  
```typescript
const measurementCache = new Map<string, TextMetrics>();

function getTextWidth(text: string, font: string): number {
    const key = `${text}_${font}`;
    if (measurementCache.has(key)) {
        return measurementCache.get(key)!;
    }
    
    ctx.font = font;
    const width = ctx.measureText(text).width;
    measurementCache.set(key, width);
    return width;
}
```
**5. Мемоизация**  
Используйте useMemo и useCallback для предотвращения лишних вычислений.
```typescript
// Мемоизируем дорогие вычисления
const visibleCells = useMemo(() => {
    return calculateVisibleCells(viewport, data);
}, [viewport, data]);

// Мемоизируем коллбэки
const handleClick = useCallback((event) => {
    // обработка
}, [/* зависимости */]);

```
## Метрики производительности  
**Целевые показатели**  
* **FPS**: >= 60 (16.6ms на кадр)  
* **Initial render**: < 100ms  
* **Scroll/Pan**: < 16ms  
* **Resize**: < 50ms  
* **Memory**: < 100MB для 10000x1000 таблицы  
**Мониторинг**  
```javascript
<CanvasTable
    enablePerformanceMonitoring={true}
    {...otherProps}
/>
В консоли браузера:
// Включить отладку
localStorage.setItem('DBG_CVS_MONITOR', '1');

// Выключить
localStorage.removeItem('DBG_CVS_MONITOR');
```
## Типичные проблемы и решения  
**Проблема: Мерцание при рендере**  

Причина: Очистка всего canvas перед каждым рендером.
Решение: Используйте dirty flags и обновляйте только измененные слои.

**Проблема: Низкий FPS при скроллинге**  

Причина: Рендер всех ячеек вместо только видимых.
Решение: Используйте виртуализацию с getViewportParams.

**Проблема: Высокое потребление памяти**  

Причина: Утечки памяти, неограниченные кэши.
Решение:
* Используйте Object Pool для переиспользования объектов  
* Ограничивайте размер кэшей  
* Очищайте EventListeners

**Проблема: Медленный resize колонок/строк**  
Причина: Пересчет всех метаданных.
Решение: Обновляйте только затронутые элементы.

```typescript
// Плохо
const newMeta = generateMetadataColumns(columnsAmount, {
    ...propsColumnsMetadata,
    [index]: { width: newWidth }
});

// Хорошо
setColumnsMetadata(prev => {
    const newMeta = [...prev];
    for (let i = index; i < newMeta.length; i++) {
        if (i === index) {
            newMeta[i] = { ...newMeta[i], width: newWidth };
        } else {
            newMeta[i] = { ...newMeta[i], x: newMeta[i-1].x + newMeta[i-1].width };
        }
    }
    return newMeta;
});

```
## Продвинутые техники  
**Web Workers для тяжелых вычислений**  
```typescript
// Используйте для:
// - Вычисления auto-fit размеров
// - Обработки больших объемов данных
// - Сложных вычислений

const { postMessage } = useWorker();

postMessage('calculateRowHeights', { data, rows }, (result) => {
    setRowsMetadata(result);
});

```
**OffscreenCanvas для предварительного рендера**  
```typescript
// Для статичного контента (headers, background)
const offscreen = new OffscreenCanvas(width, height);
const offscreenCtx = offscreen.getContext('2d');

// Рендер в offscreen
renderHeaders(offscreenCtx);

// Копирование в основной canvas
ctx.drawImage(offscreen, 0, 0);
```
**RequestIdleCallback для неприоритетных задач**  
```typescript
requestIdleCallback(() => {
    // Обновление кэшей
    // Предзагрузка данных
    // Аналитика
}, { timeout: 1000 });
```
## Чеклист перед production  
*  Включена виртуализация  
*  Используется слоистый рендеринг  
*  Кэшируются измерения текста  
*  Реализован batch rendering  
*  Мемоизированы дорогие вычисления  
*  Ограничены размеры кэшей  
*  Очищаются EventListeners  
*  Тесты производительности пройдены  
*  Профилирование показывает FPS >= 60  
*  Нет утечек памяти  