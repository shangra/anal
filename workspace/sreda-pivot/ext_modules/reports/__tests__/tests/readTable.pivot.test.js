const {
    requestData,
} = require('../fixture/fixture');

jest.setTimeout(60000) // a whole minute!

//jest по какой то причине запускает внутри себя версию ноды которая ниже нашей
global.structuredClone = (val) => JSON.parse(JSON.stringify(val))

describe('выполнить read на таблице', () => {
    describe('read', () => {
        describe('read report', () => {
            it.each(requestData)('comment = $comment, получение данных :comment', async ({ comment, url }) => {
                const data = await agent.get(url).expect(200);

                expect(data.body.rows).toEqual(expect.arrayContaining([expect.anything()]));
            })
        });
    })
})