import type { IFieldResponse } from '../pivot-menu-types';

export const collectItemsToLoad = (fields: IFieldResponse[]): IFieldResponse[] => {
    const itemsToLoad: IFieldResponse[] = [];

    const traverse = (items: IFieldResponse[]) => {
        for (const item of items) {
            if (item.ref?.value) {
                itemsToLoad.push(item);
            }
            if (item.child && item.child.length > 0) {
                traverse(item.child as IFieldResponse[]);
            }
        }
    };

    traverse(fields);
    return itemsToLoad;
};

/**
 * Загружает всех детей с помощью очереди (максимум 5 параллельных запросов)
 */
export const loadAllChildren = async (
    fields: IFieldResponse[],
    handleChildLoad: (parent: IFieldResponse, context?: string) => Promise<void>,
    context?: string,
    maxParallel: number = 5,
    maxIterations: number = 1000,
): Promise<IFieldResponse[]> => {
    fields = structuredClone(fields);

    // Собираем начальную очередь элементов для загрузки
    const queue: IFieldResponse[] = collectItemsToLoad(fields);

    // Множество для отслеживания текущих загрузок
    const loadingPromises = new Set<Promise<void>>();

    // Множество для отслеживания уже загруженных ID (защита от повторной загрузки)
    const loadedIds = new Set<string>();

    // Счетчик итераций для защиты от бесконечного цикла
    let iterationCount = 0;

    // Множество для отслеживания ID элементов, которые уже добавлены в очередь
    const queuedIds = new Set<string>(queue.map((item) => item.id));

    const processItem = async (item: IFieldResponse): Promise<void> => {
        // Проверяем, не загружен ли уже этот элемент
        if (loadedIds.has(item.id)) {
            return;
        }

        // Проверка на максимальное количество итераций
        if (iterationCount >= maxIterations) {
            throw new Error('Превышено максимальное количество итераций');
        }

        try {
            // Загружаем дочерние элементы
            await handleChildLoad(item, context);

            // Отмечаем элемент как загруженный
            loadedIds.add(item.id);

            // После загрузки проверяем, появились ли новые элементы для загрузки
            if (item.child && item.child.length > 0) {
                const newItems = collectItemsToLoad(item.child as IFieldResponse[]);

                // Добавляем только те элементы, которые еще не были загружены и не находятся в очереди
                for (const newItem of newItems) {
                    if (!loadedIds.has(newItem.id) && !queuedIds.has(newItem.id)) {
                        queue.push(newItem);
                        queuedIds.add(newItem.id);
                    }
                }
            }
        } catch (error) {
            console.error(`Ошибка при загрузке элемента ${item.id}:`, error);

            throw error;
        }
    };

    // Основной цикл обработки
    while ((queue.length > 0 || loadingPromises.size > 0) && iterationCount < maxIterations) {
        iterationCount++;

        // Запускаем новые задачи, пока есть место и есть элементы в очереди
        while (queue.length > 0 && loadingPromises.size < maxParallel) {
            const item = queue.shift()!;

            // Удаляем ID из отслеживания очереди
            queuedIds.delete(item.id);

            // Создаем промис для загрузки элемента
            const promise = processItem(item).finally(() => {
                // Удаляем промис из множества активных загрузок
                loadingPromises.delete(promise);
            });

            // Добавляем промис в множество активных загрузок
            loadingPromises.add(promise);
        }

        // Если есть активные промисы, ждем завершения хотя бы одного
        if (loadingPromises.size > 0) {
            // eslint-disable-next-line no-await-in-loop
            await Promise.race(loadingPromises);
        }
    }

    // Проверяем, не превысили ли мы максимальное количество итераций
    if (iterationCount >= maxIterations) {
        throw new Error(
            `Загрузка не завершена: достигнуто максимальное количество итераций(${maxIterations}).` +
                `Осталось элементов в очереди: ${queue.length}, активных загрузок: ${loadingPromises.size}`,
        );
    }

    // Дожидаемся завершения всех оставшихся загрузок
    if (loadingPromises.size > 0) {
        await Promise.all(loadingPromises);
    }

    return fields;
};
