const FSCK = require('../../index');

const SelectableFieldMixin = {
    async *fsck_self(self, opts) {
        const path = FSCK.path_meta(
            opts?.path,
            self.id,
            this?.constructor?.name,
            self.name
        );

        const self_settings = self.manifest.settings;

        // name                 : self.manifest.name,                 // Наименование объекта
        yield FSCK.check(
            FSCK.path_prop(path, 'name'),
            `Поле имеет непустое свойство name`,
            !!String(self.manifest.name ?? '').length,
            true,
            { self }
        );

        // TODO?
        // desc                 : self.manifest.description,          // Описание объекта

        // db_name              : self_settings.nameField,            // Имя поля в СУБД
        yield FSCK.check(
            FSCK.path_prop(path, 'nameField'),
            `Поле имеет непустое свойство nameField`,
            !!String(self_settings.nameField ?? '').length,
            true,
            { self }
        );

        // db_type              : self_settings.type,                 // Тип поля
        yield FSCK.check(
            FSCK.path_prop(path, 'type'),
            `Поле имеет корректное свойство type`, // см. DDL / db_type_meta2real
            self_settings.type ?? null,
            FSCK.is.any([
                'uuid',
                'text',
                'string',
                'integer',
                'float',
                'date',
                'datetime',
                'boolean',
                'ref',
            ]),
            { self }
        );

        // TODO?
        // db_length            : self_settings.length,               // Длина

        // is_virtual           : self_settings.virtual,              // Виртуальное поле
        // is_calculated        : self_settings.calculated,           // Вычисляемое виртуальное поле
        // fn                   : self_settings.fnfield,              // Значение виртуального поля
        const is_pseudo = self_settings.virtual || self_settings.calculated;
        if (is_pseudo) {
            yield FSCK.check(
                FSCK.path_prop(path, ['calculated', 'virtual'], 'calc/virt'),
                `Поле не должно быть одновременно виртуальным и вычисляемым`,
                /* !is_pseudo || */ !(
                    self_settings.calculated && self_settings.virtual
                ),
                true,
                { self }
            );
            yield FSCK.check(
                FSCK.path_prop(path, 'fnfield'),
                `Для виртуального/вычисляемого поля должно быть указано значение`,
                !!String(self_settings.fnfield ?? '').trim().length,
                true,
                { self }
            );
        }

        // TODO?
        // hierarchy_enabled    : self_settings.hierarchy,            // Поддержка иерархии
        // hierarchy_subtotal   : self_settings.subtotal,             // Промежуточные итоги иерархии
        // _foreignkey          : self_settings.foreignkey,           // Внешний ключ (?)
        // join_target_ref      : self_settings.ref,                  // Ссылка
        // join_order_field     : self_settings.refOrderField,        // Поле сортировки по ссылке
        // join_order_dir       : self_settings.refOrderDirection,    // Направление сортировки
        // join_order_enabled   : self_settings.isOrderOn,            // Сортировка активна
        // join_format          : self_settings.SQLQueryFormat,       // Формат соединения; известные варианты: useView (денорм), isOrderOn (вирт), useWith (субд)
        // is_off               : self_settings.onoff,                // Отключить
    },
};

module.exports = SelectableFieldMixin;
