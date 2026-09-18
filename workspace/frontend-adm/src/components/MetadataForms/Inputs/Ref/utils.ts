export const replaceTemplate  = (templateString: string, dataObject: { [x: string]: string;}, refsObject?: {[x: string]: {[x: string]: string;}}) => {
    let str = templateString

    // Вытаскиваем поля (все фрагменты внутри [[...]])
    const fields = (str.match(/\[\[(.*?)\]\]/g));
    
    if (!fields || !fields.length) return str;

    for (const field of fields) {
        str = str.replace(field, field.replaceAll(' ', ''))
    }
  
    const placeholderMap: { [x: string]: string;} = {};

    for (const field of fields) {
        // Извлечём имя ключа без скобок 
        const key = field.replaceAll(' ', '').slice(2, -2); // Удаляем начальные и конечные символы `[[` и `]]`
        
        // Проверим наличие такого ключа в переданном объекте
        if (Object.hasOwn(dataObject, key)) {
            placeholderMap[key] = refsObject?.[key]?.[dataObject[key]] ?? dataObject[key];
        }
    }

    // Преобразуем наш промежуточный объект в массив пар ключ-значение
    const entries = Object.entries(placeholderMap);

    // Заменим найденные шаблоны соответствующими значениями
    let result = str;
    for (const entry of entries) {
        const value = entry[1];
        const regex = `[[${entry[0]}]]`

        result = result.replace(regex, value);
    }

    return result;
}