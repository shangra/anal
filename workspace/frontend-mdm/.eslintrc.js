module.exports = {
    root: true,
    env: {
        browser: true,
    },
    extends: ['plugin:react/recommended', 'airbnb', 'prettier', 'react-app', 'react-app/jest'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
    },

    plugins: ['react', '@typescript-eslint', 'react-hooks'],
    rules: {
        'react/jsx-filename-extension': [
            2,
            {
                extensions: ['.js', '.jsx', 'tsx'],
            },
        ],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'guard-for-in': 'off',
        'react/static-property-placement': 'off',
        'import/no-unresolved': 'error',
        'import/prefer-default-export': 'off',
        'react/require-default-props': 'off',
        'max-classes-per-file': ['warn', 2],
        'react/react-in-jsx-scope': 'off',
        'react/jsx-props-no-spreading': 'warn',

        'react/function-component-definition': 0,
        'react/button-has-type': 'warn',
        'no-shadow': 'off',
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
        'no-plusplus': 0,
        'react/no-array-index-key': 0,
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            },
        ],
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
                moduleDirectory: ['node_modules', 'src/'],
            },
        },
    },
};
