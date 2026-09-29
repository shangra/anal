import DownloadJS from '../vendors/download-react';
import { BACKEND_PROXY } from '../settings/settings';

const downloadFile = (fileLink = { name: 'error', md5: 'error' }) => {
    // Для безопасного скачивания нужно будет передать временный токен который выдается пользователю в режиме real-time
    const { id, name, ext } = fileLink;

    const url = `${BACKEND_PROXY}/files/get/${id}/${name}${ext}`;
    return fetch(url, {
        method: 'GET',
        headers: {
            // 'Authorization': token
        },
    })
        .then((resp) => resp.blob())
        .then((blob) => {
            DownloadJS(blob, name + ext);
        });
};

export default downloadFile;
