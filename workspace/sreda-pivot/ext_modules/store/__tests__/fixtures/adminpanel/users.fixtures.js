const setData = [
    { key: 'test1', value: 'value1' },
    { key: 'test2', value: 'value2' },
    { key: 'theme', value: 'galaxy' },
    { key: 'theme', value: 'notGalaxy' },
];

const getData = [
    { key: 'test1', result: { result: true, data: 'value1' } },
    { key: 'test2', result: { result: true, data: 'value2' } },
    { key: 'notExistedKey', result: { result: true } },
];

module.exports = { getData, setData };
