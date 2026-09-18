// добыча link и value из следующих данных:
// manifest.settings.connector (Infoservice (и другие) -> Connector)
// manifest.settings.ref (InfoserviceGuide.Keys[] -> Fields)
// manifest.settings.keyId (InfoserviceFlatGuide.Hierarchy[].Level[] -> Keys)
// manifest.settings.ref (InfoserviceGuide.Keys[].FieldsList[] -> Fields)
// manifest.settings.fieldhierarchy (InfoserviceGuide -> Fields)
// UNKNOWN структура этого значения везде одинаковая или это просто совпадение для перечисленных случаев?
function ref_extract(ref) {
    // ref
    // ref.link -- видимо, корневой объект дерева матаданных (напр. справочники инфосервисов или справочники инфосервисов (flat))
    //      вообще неясно что это, может быть, напр. 6c48c552-ef7c-460d-87ad-ebf820f26f42,
    //      но этого id нет в базе (это pk из УК_Календарь_flat, на котором я отлаживался)
    // ref.value -- id целевого объекта метаданных
    // иногда ref == "0", я не понимаю, что это
    // так что if (....ref?.link) не работает из-за type mangling
    // иногда нужный id это не ref.value, а просто ref (проверить, что это так)

    const typeof_ref = typeof ref;
    return ("object" == typeof_ref)
        ? { link: ref.link, value: ref.value }                          // не тащим из ref что-то, что там ещё может быть!
        : { link: null, value: ("string" == typeof_ref && ref != "0") ? ref : null }  // если не нашли там строку, то лучше взорвёмся с ошибкой, чем будем гадать
        ;
};

module.exports = {
    ref_extract,
};
