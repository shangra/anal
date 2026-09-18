function do_sets_match(seta, setb) {
    if (seta.size != setb.size) return false;
    for (const value of seta) if (!setb.has(value)) return false;
    return true;
};

function do_sets_intersect(seta, setb) {
    if (setb.size < seta.size) [seta, setb] = [setb, seta];
    for (const value of seta) if (setb.has(value)) return true;
    return false;
};

/**
 * регистр дедупликации для Set, эксплуатируется ссылочная природа переменных в js
 * при добавлении смотрим, есть ли у нас уже некоторый Set: и если да, используем существующий, отбрасывая новый
 * иначе сохраняем в регистр
 */
class WellknownSets {
    constructor() {
        this.registry = new Set();
    }

    /**
     * @param {Iterable<any>} what
     */
    _get(what) {
        const { registry } = this;
        if (registry.has(what)) return [true, what]; // если на входе уже то, что у нас сохранено, то и делать нечего
        const item = new Set(what); // искомый элемент, который может стать новым
        const size = item.size; // его размер
        for (const memb of registry) { // ищем по уже хранимым
            if (size != memb.size) continue; // размер должен совпадать, иначе нечего проверять
            let every = true; // "все элементы совпадают"
            for (const i of item) if (!(every = memb.has(i))) break;
            if (every) return [true, memb]; // нашли такой же, но уже среди сохранённых
        }
        return [false, item]; // не нашли
    }

    /**
     * получить объект из регистра, если он существует
     */
    get(what) {
        const [found, item] = this._get(what);
        if (found) return item;
        // (implicitly) return undefined;
    }

    /**
     * получить объект из регистра; создать при отсутствии
     */
    for(what, store = true) {
        const [found, item] = this._get(what);
        if (!found) this.registry.add(item);
        return item;
    }

    /**
     * удалить объект; вернёт удалённый объект, если он был
     */
    del(what) {
        const [found, item] = this._get(what);
        if (found) return this.registry.delete(item), item;
        // (implicitly) return undefined;
    }
};

module.exports = {
    WellknownSets,
    do_sets_intersect,
};
