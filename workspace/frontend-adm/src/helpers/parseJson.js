export default function parseJson(jsonStr, defaultValue = { message: 'Не удалось разобрать данные. Некорректный json' }) {
    try {
        return { status: true, result: JSON.parse(jsonStr) };
    } catch (e) {
        console.log('error json parsing', jsonStr);
        return { status: false, result: defaultValue };
    }
}
