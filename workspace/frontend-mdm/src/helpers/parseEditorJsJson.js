const errorDataParse = {
    time: 1658993859445,
    blocks: [
        {
            id: 'null',
            type: 'header',
            data: {
                text: 'Ошибка разбора данных',
                level: 2,
            },
            tunes: {
                alignmentTune: {
                    alignment: 'center',
                },
            },
        },
    ],
    version: '2.23.2',
};

export default function parseEditorJsJson(data) {
    try {
        return JSON.parse(data);
    } catch (e) {
        console.log('ОШИБКА РАЗБОРА ДАННЫХ', data);
        return errorDataParse;
    }
}
