import { v4 as uuid } from 'uuid';

import $api from './axios';

const splitFile = (file, maxChunkSize) => {
    const result = [];

    const chunksCount = Math.ceil(file.size / maxChunkSize);

    for (let chunkIndex = 0; chunkIndex < chunksCount; chunkIndex++) {
        const chunkStartIndex = maxChunkSize * chunkIndex;
        const chunk = file.slice(chunkStartIndex, chunkStartIndex + maxChunkSize);
        result.push(chunk);
    }

    return result;
};

export const uploadFile = async (method, url, data, file, params) => {
    let result;

    const FILE_MAX_SIZE = Number(process.env.REACT_APP_UPLOAD_FILE_LIMIT ?? 1024 * 1024 * 5);

    const formData = new FormData();
    if (typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    }

    if (file.size <= FILE_MAX_SIZE) {
        formData.append('upload', file);
        const query = params ? `&${params}` : '';
        result = await $api[method](`${url}?${query}`, formData, {
            headers: {
                'Content-type': 'multipart/form-data',
            },
        });
    } else {
        const splitId = uuid();
        // разбиваем файл на чанки
        const chunks = splitFile(file, FILE_MAX_SIZE);

        // загружаем чанки с параметром splitDownload = true в query
        const promises = chunks.map((chunk, i) => {
            const chunkName = `${i}_${splitId}`;
            const chunkFormData = new FormData();
            const chunkFile = new File([chunk], chunkName);
            chunkFormData.append('upload', chunkFile);
            const query = `splitDownload=true&${params}`;
            return $api[method](`${url}?${query}`, chunkFormData, {
                headers: {
                    'Content-type': 'multipart/form-data',
                },
            });
        });

        // загружаем пустой файл с описанием источника и splitId в query строке
        result = await Promise.all(promises).then(() => {
            const query = `?splitId=${splitId}&${params}`;
            const fakeFile = new File([file.slice(0, 50)], file.name, { type: file.type });
            formData.append('upload', fakeFile);
            return $api[method](`${url}${query}`, formData, {
                headers: {
                    'Content-type': 'multipart/form-data',
                },
            });
        });
    }

    return result;
};
