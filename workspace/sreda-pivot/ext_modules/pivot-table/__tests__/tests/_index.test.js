const util = require('node:util');

const matrix_with_index = require('../fixture/matrix_with/_index');
const matrix_case_index = require('../fixture/matrix_case/_index');
const view_index = require('../fixture/view/_index');
const case_index = require('../fixture/case/_index');
const with_index = require('../fixture/with/_index');

const sleep = util.promisify(setTimeout);

jest.setTimeout(60 * 20 * 1000); // a whole 20 minutes!

//jest по какой то причине запускает внутри себя версию ноды которая ниже нашей
global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

const maxRequestTimes = 300;

const id = `e5fd0c3f-0952-47b4-aa56-8f1830b8da5c`;

describe(`проверка построений срезов`, () => {
    /**
     * @argument {any} req
     * @argument {any} res
     * @argument {import('supertest').Agent} agent
     */
    const check = async (req, res, agent) => {
        const result = await agent.post(`/pivottables/body/new/${id}`).send(req).expect(200);

        expect(result.body).toMatchObject(expect.objectContaining({ status: expect.any(String), answerId: expect.any(String), }),);

        const { answerId, status } = result.body;

        if (status === `ok`) {
            expect(result.body).toEqual(expect.objectContaining(res));

            return;
        }

        let i = 0;
        do {
            const data = await agent.get(`/pivottables/body/ce51ba98-b28f-4d56-9eda-49d6d7f8ad24/${answerId}`).expect(200);

            if (data.body.status === `ok`) {
                expect(data.body).toEqual(expect.objectContaining(res));

                return;
            }

            await sleep(1000);

            i++;
        } while (i < maxRequestTimes);

        throw new Error(`timeout`);
    };

    describe(`matrix`, () => {
        it.each(matrix_case_index)(
            `построение среза на матричных кейсах: $comment`,
            async ({ req, res }) => {
                await check(req, res, agent);
            }
        )

        it.each(matrix_with_index)(
            `построение среза на матричных джоинах: $comment`,
            async ({ req, res, comment }) => {
                await check(req, res, agent);
            }
        )

    })

    describe(`plain`, () => {
        it.each(case_index)(
            `построение срезов на кейсах: $comment`,
            async ({ req, res }) => {
                await check(req, res, agent);
            }
        )


        it.each(with_index)(
            `построение среза на джоинах: $comment`,
            async ({ req, res, comment }) => {
                await check(req, res, agent);
            }
        )

        it.skip.each(view_index)(
            `построение среза на денормализации: $comment`,
            async ({ req, res, comment }) => {
                await check(req, res, agent);
            }
        )
    })
})