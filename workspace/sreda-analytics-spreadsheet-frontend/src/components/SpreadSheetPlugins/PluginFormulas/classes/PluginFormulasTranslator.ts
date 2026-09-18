import en from './i18n/en';
import ru from './i18n/ru';

const locales = {
    en,
    ru,
} as const;

type TFormulasLocale = keyof typeof locales;

export default class PluginFormulasTranslator {
    private locale: TFormulasLocale = 'ru';

    constructor(locale: TFormulasLocale = 'ru') {
        this.locale = locale;
    }

    escapeRegex(str: string) {
        return str.replace(/\./g, '\\.');
    }

    /**
     * Translates a formula from locale to English.
     *
     * @param {string} formula - The formula string with locale functions.
     * @returns {string} The formula string with English functions.
     */
    translate(formula: string): string {
        if (this.locale === 'en') return formula;

        const locale = locales[this.locale];

        const fromNames = Object.keys(locale.names).sort((a, b) => b.length - a.length);

        const regex = new RegExp(fromNames.map(this.escapeRegex).join('|'), 'gi');

        return formula
            .replace(/"[^"]*"|'[^']*'|([0-9]+),([0-9]+)|(;)/g, (match, numBefore, numAfter, semicolon) => {
                // Если это строка в двойных или одинарных кавычках — возвращаем без изменений
                if (match.startsWith('"') || match.startsWith("'")) {
                    return match;
                }
                // Если нашли десятичную запятую между цифрами — меняем на точку
                if (numBefore && numAfter) {
                    return `${numBefore}.${numAfter}`;
                }
                // Если нашли точку с запятой (разделитель аргументов) — меняем на запятую
                if (semicolon) {
                    return ',';
                }
                return match;
            })
            .replace(regex, (match) => {
                const upper = match.toUpperCase();
                return locale.names[upper as keyof typeof locale.names] ?? match;
            });
    }

    getArguments(formula: string): string {
        const locale = locales[this.locale];
        const upper = formula.toUpperCase();
        const args = locales[this.locale]?.args[upper as keyof typeof locale.args];
        if (args) {
            return `${upper}(${args})`;
        }
        return '';
    }

    list(): Record<string, string> {
        return locales[this.locale].description;
    }
}
