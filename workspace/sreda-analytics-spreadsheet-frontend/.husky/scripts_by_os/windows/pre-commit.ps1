function generateError {
    param ([string]$errorIn)
        return "Commit interrupted. Before commit you have to fix $errorIn errors"
}

# Получение списка измененных файлов в workspace front.source
$allChangedFiles = git diff --cached --name-only --diff-filter=ACM

# Получение JavaScript и TypeScript файлов
$javaScriptAndTypeScriptFiles = $allChangedFiles | Where-Object {
    ($_ -like "*.js" -or $_ -like "*.jsx" -or $_ -like "*.ts" -or $_ -like "*.tsx") -and
    ($_ -ne "updateReadme.js")
}

$frontendTypeScriptFiles = $javaScriptAndTypeScriptFiles | Where-Object {
    ($_ -like "*.ts" -or $_ -like "*.tsx")
}

# Импорт env-переменных
$envPath = ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -notmatch "^#") {
            $name, $value = $_ -split "=", 2
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Проверка значений переменных из .env
$PRE_COMMIT_PROCESS = $env:PRE_COMMIT_PROCESS
$COMMIT_ABORT_ESLINT_LEVEL = $env:COMMIT_ABORT_ESLINT_LEVEL
if (-not $PRE_COMMIT_PROCESS) {
    $PRE_COMMIT_PROCESS = "on"
}

Write-Output "Pre-commit toggle (on/off): PRE_COMMIT_PROCESS=$PRE_COMMIT_PROCESS"
if (-not $COMMIT_ABORT_ESLINT_LEVEL) {
    $COMMIT_ABORT_ESLINT_LEVEL = "all"
}
Write-Output "Error level for commit interruption (all/error-only/never): COMMIT_ABORT_ESLINT_LEVEL=$COMMIT_ABORT_ESLINT_LEVEL"

if ($PRE_COMMIT_PROCESS -eq "off") {
    Write-Output "Pre-commit processing offed by settings in .env in repo root"
    exit 0
}

# Запуск компиляции TypeScript, если есть изменения в TypeScript файлах
Write-Output "Compilation Frontend TypeScript..."
if ($frontendTypeScriptFiles) {
    if (-not (npm run ts-check)) {
        Write-Output "$(generateError "TypeScript")"
        exit 1
    }
    Write-Output "TypeScript compilation Stage SUCCESS"
} else {
    Write-Output "Changes in .ts|.tsx files not found. TypeScript compilation Stage SKIPPED"
}

if ($javaScriptAndTypeScriptFiles) {
    # Запуск ESLint для измененных файлов
    Write-Output "Starting Eslint for changed files..."
    $env:FILES = $javaScriptAndTypeScriptFiles
    if ($COMMIT_ABORT_ESLINT_LEVEL -eq "never") {
        npm run eslint
        Write-Output "All errors and warnings skipped, because of flag COMMIT_ABORT_ESLINT_LEVEL is set to $COMMIT_ABORT_ESLINT_LEVEL"
    } elseif ($COMMIT_ABORT_ESLINT_LEVEL -eq "error-only") {
        $env:ADDITIONAL_FLAG = "--quiet"
        if (-not(npm run eslint)) {
            Write-Output "$(generateError "Eslint")"
            exit 1
        }
    } else {
        if (-not(npm run eslint)) {
            Write-Output "$(generateError "Eslint")"
            exit 1
        }
    }
    Write-Output "Eslint Stage SUCCESS!"
}

# Запуск Prettier для измененных файлов
Write-Output "Starting Prettier for changed files"
# Если есть измененные JavaScript/TypeScript файлы - прогон через Prettier
if ($javaScriptAndTypeScriptFiles) {
    if (-not(npm run prettier $javaScriptAndTypeScriptFiles)) {
        Write-Output "Not correct files format. Please, fix them with Prettier."
        exit 1
    }
}
Write-Output "Prettier Stage SUCCESS"

# Добавление в индекс изменений в обработанных файлах
if ($javaScriptAndTypeScriptFiles) {
    git add $javaScriptAndTypeScriptFiles
}

Write-Output "Pre-commit process finished successfully"
