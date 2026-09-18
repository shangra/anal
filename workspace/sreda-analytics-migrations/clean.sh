#!/bin/bash
set -e  # остановка при ошибке

# Проверяем наличие корневой папки
if [ ! -d "ext_modules" ]; then
    echo "Ошибка: ext_modules не найдена." >&2
    exit 1
fi

# Проходим по всем папкам внутри ext_modules
for module in ext_modules/*/; do
    module="${module%/}"          # убираем завершающий слеш
    db_dir="${module}/db"

    # Проверяем, что db — это папка и она не пуста
    if [ -d "$db_dir" ] && [ -n "$(ls -A "$db_dir")" ]; then
        echo "Оставляем db в $module, удаляем всё остальное"
        # Перебираем все элементы внутри модуля
        for item in "$module"/*; do
            # Удаляем всё, кроме самой папки db
            if [ "$item" != "$db_dir" ]; then
                rm -rf "$item"
            fi
        done
    else
        echo "Удаляем модуль $module (нет db или она пуста)"
        rm -rf "$module"
    fi
done