const globals = require('globals');

module.exports = [
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$|^req$|^res$' }],
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'prefer-const': 'warn',
            'no-var': 'warn',
        },
    },
    {
        ignores: [
            'node_modules/**',
            'client/**',
            'scripts/**',
            'backup/**',
            '*.min.js',
        ],
    },
];
