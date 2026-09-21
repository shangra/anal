const Extensions = require('../../../core/class/Extensions.class');

const httpContext = require('../../../core/services/http-context');

const ExplainRequest = require('./models/ExplainRequest.model');
const ExplainRequestMeta = require('./models/ExplainRequestMeta.model');

/*
const { Parser: NodeSQLParser } = require("node-sql-parser");
*/

// TODO: сейчас константа НЕ ЗАНЕСЕНА в класс и соотв-но НЕ ЭКСПОРТИРУЕТСЯ
// ключ в httpContext, отвечающий за данные, которые накапливает профилировщик
// по наличию там значения можно чуять, что профилирование активировано
const HTTPCTX_PROP_EXPLAIN = 'explain';

// FYI: ... делать примерно так:
// MetaQueryExplainService_isActive = sreda.versions["meta-query-explain"] && httpContext.get(MetaQueryExplainService.HTTPCTX_PROP_EXPLAIN);
// т.е. использовать константу из модуля, при этом отсутствие модуля не должно ломать логику

class MetaQueryExplainService extends Extensions {
    async get(id) {
        return await ExplainRequest.get(id);
    }

    async getMeta(id) {
        //return await ExplainRequestMeta.get(id);
        const { dataValues: result } = await ExplainRequestMeta.get(id);
        /*
                let query = result.meta.query;
                if (query) {
                    const opt = { database: 'Postgresql' };
                    const parser = new NodeSQLParser();
                    const ast = parser.astify(query, opt);
                    //result.meta.query = JSON.stringify(ast, null, 4);
                    result.meta.query = parser.sqlify(ast, { ...opt, pretty_print: true }) + "\n\n/* " + query + " *"+"/";
                }
        */
        return result;
    }

    async del(id) {
        return await ExplainRequest.del(id);
    }

    // decorates PivotTableService._get / ReportService._get
    // Extensions may pass named fargs or positional (result, id, params, options)
    async init(inner, fargs, original) {
        const callArgs = Array.isArray(fargs?.$args)
            ? fargs.$args
            : Array.isArray(fargs?.args)
              ? fargs.args
              : Array.isArray(fargs)
                ? fargs
                : null;

        const result =
            (fargs && typeof fargs === 'object' && !Array.isArray(fargs) && fargs.result) ||
            (inner && typeof inner === 'object' && inner.answerId && inner) ||
            (Array.isArray(callArgs) ? callArgs[0] : null) ||
            {};

        const answerId = result.answerId;
        const id =
            (typeof fargs?.id === 'string' && fargs.id) ||
            (Array.isArray(callArgs) ? callArgs[1] : undefined);
        const params =
            (fargs && typeof fargs === 'object' && !Array.isArray(fargs) && fargs.params && typeof fargs.params === 'object'
                ? fargs.params
                : null) ||
            (Array.isArray(callArgs) && callArgs[2] && typeof callArgs[2] === 'object' ? callArgs[2] : {}) ||
            {};
        const options =
            (Array.isArray(callArgs) ? callArgs[3] : undefined) ||
            (fargs && typeof fargs === 'object' && !Array.isArray(fargs) ? fargs.options : undefined);

        const applyOriginal = () => {
            if (typeof original !== 'function') {
                return inner;
            }
            if (Array.isArray(callArgs) && callArgs.length) {
                return original.apply(this, callArgs);
            }
            return original.apply(this, [result, id, params, options]);
        };

        if (!params.explain || !answerId) {
            return applyOriginal();
        }

        // params.explain -- это флажок от PivotTableService._get (HTTPCTX_PROP_EXPLAIN -- про другое)
        // и если _там_ профилирование ВКЛЮЧЕНО, то инициализируем контекст для накопления данных
        httpContext.set(HTTPCTX_PROP_EXPLAIN, { answerId, steps: [] });

        const promise = applyOriginal();

        let explained;
        let error;
        try {
            explained = await promise;
        } catch (e) {
            error = e;
        }

        // т.к. декорирование всегда делается асинхронно, а декорируемые с помощью .addConsole методы -- синхронные,
        // то надо иметь ввиду, что разрешение системных промисов делается вне основного цикла ноды
        // соответственно, <===== вот в этой точке самый последний вызов .addConsole мог ещё не разрешиться
        // и надо подождать следующей итерации главного цикла перед получением нашего контекста...

        await new Promise((resolve) => process.nextTick(resolve));

        // ... после этой манипуляции все .addConsole гарантированно отработали и теперь наш контекст консистентен:
        const ctx = httpContext.get(HTTPCTX_PROP_EXPLAIN);
        const steps = Array.isArray(ctx?.steps) ? ctx.steps : [];

        await Promise.all(
            steps.map(async (step) => {
                if (!step.context) return;
                const { id: metaId } = await ExplainRequestMeta.new(
                    { answerId, meta: JSON.stringify(step.context) },
                    { returning: true }
                );
                step.context = metaId; // заменяем в оригинальном массиве содержимое context на полученный идентификатор
            })
        );

        // здесь можно было бы без await, но результат работы профилировщика может завершить сохранение уже после ответа фронту
        // (вряд ли, конечно, фронт успеет спросить этот результат раньше, чем он таки будет сохранён, но тем не менее)
        await ExplainRequest.new({
            answerId,
            plan: JSON.stringify(ctx || {}),
        });

        if (error) {
            throw error;
        }

        return explained;
    }

    // decorates InfoserviceClass.console
    // decorates InfoServiceFlatGuidClass.console
    // decorates InfoServiceGuidClass.console
    // decorates PivotTableService.console
    // expect args (msg, meta)
    // декоратор асинхронный, НО РАССЧИТЫВАТЬ НА ЭТУ АСИНХРОННОСТЬ НЕЛЬЗЯ, потому что оригинал синхронный, следовательно,
    // никто не использует его с await и поэтому 1) может нарушаться порядок логированных операций и 2) можем терять записи
    // + см this.init()
    async addConsole(innerResult, functionParams, originalMethod) {
        const ctx = httpContext.get(HTTPCTX_PROP_EXPLAIN);

        // TODO INCONSISTENT: почему здесь именно Object.values(functionParams)?
        // (никто не гарантирует сохранение порядка значений в объекте при итерировании)
        // FYI декорируемая функция синхронная, оставляем здесь промис только для совместимости с другими декораторами, if any
        const promise = originalMethod.apply(this, Object.values(functionParams));

        if (!ctx) {
            // профилирование не было активировано
            return promise;
        }

        const { msg, meta } = functionParams;

        const step = {
            date: new Date(),
            message: msg,
            context: meta || null, // meta => metaId см this.init()
        };

        ctx.steps.push(step);

        // это не обязательно (точнее, даже вредно), т.к. работаем с ctx по ссылке:
        // httpContext.set(HTTPCTX_PROP_EXPLAIN, ctx);

        return promise;
    }
}

module.exports = MetaQueryExplainService;
