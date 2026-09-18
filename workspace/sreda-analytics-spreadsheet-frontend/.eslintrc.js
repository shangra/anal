module.exports = {
    root: true,
    env: {
        browser: true,
    },
    extends: [
        'plugin:prettier/recommended',
        'airbnb',
        'prettier',
        'react-app/jest',
        'plugin:react/recommended',
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
    },

    plugins: ['react', '@typescript-eslint', 'react-hooks', 'simple-import-sort'],
    rules: {
        'react/jsx-filename-extension': [
            2,
            {
                extensions: ['.js', '.jsx', '.tsx', '.ts'],
            },
        ],
        'no-void': 'warn',
        'no-shadow': 'warn',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'guard-for-in': 'off',
        'no-labels': 'off',
        'no-bitwise': 'off',
        'react/static-property-placement': 'off',
        'import/no-unresolved': 'error',
        'import/prefer-default-export': 'off',
        'react/require-default-props': 'off',
        'max-classes-per-file': ['warn', 1],
        'react/react-in-jsx-scope': 'off',
        'react/jsx-props-no-spreading': 'warn',

        'prettier/prettier': ['error', { endOfLine: 'auto' }],

        'react/function-component-definition': 0,
        'react/button-has-type': 'warn',
        'import/extensions': 0,
        'no-underscore-dangle': 'off',
        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/no-static-element-interactions': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'no-param-reassign': 'off',
        'react/prop-types': 'off',
        'import/no-relative-packages': 0,
        'class-methods-use-this': 0,
        'react/prefer-stateless-function': 0,
        'import/no-extraneous-dependencies': 0,
        'react/destructuring-assignment': 0,
        'import/no-cycle': 'off',
        'react/sort-comp': 'off',
        'import/order': 'off',
        'no-continue': 'off',
        'no-restricted-syntax': 'off',
        'no-plusplus': 0,
        'default-case': 'off',
        'react/no-array-index-key': 0,
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            },
        ],
        'no-unused-vars': [
            'warn',
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            },
        ],
        'simple-import-sort/imports': 'error',
        'no-await-in-loop': 'warn',
        'no-empty-function': 'off',
        'no-useless-constructor': 'off',
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
                moduleDirectory: ['node_modules', 'src/'],
            },
        },
    },
    globals: {
        NodeJS: true,
    },
};
