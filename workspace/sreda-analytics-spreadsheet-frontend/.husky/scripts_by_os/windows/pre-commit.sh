# Получение списка измененных файлов в workspace front.source
allChangedFiles=$(git diff --cached --name-only --diff-filter=ACM)
javaScriptAndTypeScriptFiles=$(echo "$allChangedFiles" | grep -E '.*\.(js|jsx|ts|tsx)$' | grep -v 'updateReadme.js')
typeScriptFiles=$(echo "$javaScriptAndTypeScriptFiles"| grep -E '.*\.(ts|tsx)$')

# Импорт env-переменных
export $(grep -v '^#' .env | xargs -0) >/dev/null 2>&1

if [ -n "$PRE_COMMIT_PROCESS" ]; then
    echo "Прекоммит тумблер (on/off): PRE_COMMIT_PROCESS=$PRE_COMMIT_PROCESS"
else
    echo "Прекоммит тумблер (on/off): PRE_COMMIT_PROCESS=on (установлено по умолчанию)"
fi
if [ -n "$COMMIT_ABORT_ESLINT_LEVEL" ]; then
    echo "Уровень ошибки для прерывания коммита (all/error-only/never): COMMIT_ABORT_ESLINT_LEVEL=$COMMIT_ABORT_ESLINT_LEVEL"
else
    echo "Уровень ошибки для прерывания коммита (all/error-only/never): COMMIT_ABORT_ESLINT_LEVEL=all (установлено по умолчанию)"
fi

if [ "$PRE_COMMIT_PROCESS" = "off" ]; then
    echo "Pre-commit обработка отключена в настройках .env в корне репозитория\n" 
    exit 0
fi

# Если есть измененные JavaScript/TypeScript файлы - прогон через ESLint
if [ -n "$javaScriptAndTypeScriptFiles" ]; then
    echo "\nКомпиляция Frontend TypeScript... 🕒"
    if [ -n "$typeScriptFiles" ]; then
        if ! npm run ts-check; then
            echo '\n🔴 Коммит прерван. Перед коммитом изменений необходимо исправить ошибки TypeScript\n'
            exit 1
        fi
        echo "TypeScript compilation Stage ✅\n"
    else
        echo "Изменений в .ts|.tsx файлах не обнаружено. TypeScript compilation Stage skipped ✅"
    fi

    echo "\nЗапуск ESLint для измененных файлов... 🕒"
    if [ "$COMMIT_ABORT_ESLINT_LEVEL" = "never" ]; then
        FILES=$javaScriptAndTypeScriptFiles npm run eslint
        echo "Все ошибки были пропущены, так как флаг COMMIT_ABORT_ESLINT_LEVEL установлен в $COMMIT_ABORT_ESLINT_LEVEL 🚫\n"
    elif [ "$COMMIT_ABORT_ESLINT_LEVEL" = "error-only" ]; then
        # Запускаем Eslint для front.source сервиса и проверяем код возврата    
        if ! FILES=$javaScriptAndTypeScriptFiles ADDITIONAL_FLAG=--quiet npm run eslint; then
            echo "\n🔴 Коммит прерван. Перед коммитом изменений необходимо исправить ошибки Eslint\n"
            exit 1
        fi
    else
        # Запускаем Eslint для front.source сервиса и проверяем код возврата
        if ! FILES=$javaScriptAndTypeScriptFiles npm run eslint; then
            echo "\n🔴 Коммит прерван. Перед коммитом изменений необходимо исправить ошибки Eslint\n"
            exit 1
        fi
    fi
    echo "Eslint Stage ✅\n"
fi

echo "Запуск Prettier для измененных файлов... 🕒"
# Если есть измененные JavaScript/TypeScript файлы - прогон через Prettier
if [ -n "$javaScriptAndTypeScriptFiles" ]; then
    if ! npm run prettier $javaScriptAndTypeScriptFiles; then
        echo "\n🔴 Некорректные форматы файлов. Пожалуйста, исправьте их с помощью Prettier."
        exit 1
    fi
fi
echo "Prettier Stage ✅\n\n"

# Добавление в индекс изменений в обработанных файлах
if [ -n "$javaScriptAndTypeScriptFiles" ]; then
    git add $javaScriptAndTypeScriptFiles
fi

echo "Pre-commit process finished successfully ✅\n"