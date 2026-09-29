export default function parseHeaders(headersStr, defaultValue = []) {
    try {
        const data = headersStr.replaceAll(/[{}]/g, '').split(',');
        return { status: true, result: data[0] === '' ? [] : data };
    } catch (e) {
        console.log('error json parsing', headersStr);
        return { status: false, result: defaultValue };
    }
}
