function download(data, strFileName, strMimeType) {
    const isUtf = strMimeType && strMimeType?.toLowerCase()?.includes('utf');
    const fileData = isUtf ? [`\uFEFF`, data] : [data];
    // Генерируем URL
    const url = URL.createObjectURL(
        // Создаем файл
        new File(fileData, strFileName, {
            type: strMimeType ?? 'application/octet-stream',
        }),
    );

    // Создаём ссылку
    const aElement = document.createElement('a');
    aElement.href = url;
    aElement.download = strFileName;

    // Открываем ссылку
    aElement.click();

    // удаляем ссылку и бинарные данные
    window.URL.revokeObjectURL(aElement.href);
    aElement.remove();

    return true;
}

module.exports = download;
