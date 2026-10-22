import js from '@eslint/js';
import globals from 'globals';
import cypress from 'eslint-plugin-cypress';
import prettier from 'eslint-config-prettier';

/**
 * ESLint 9 flat config.
 *
 * This repo is plain JavaScript on purpose — it is the JS counterpart to
 * cypress-typescript-e2e — and that costs the single most valuable rule in a
 * test suite: `no-floating-promises` needs type information, so it cannot
 * exist here. Cypress softens that blow more than most frameworks, because its
 * commands are queued rather than awaited: there is no promise to forget. The
 * Cypress-specific rules cover what remains.
 */
export default [
    {
        ignores: [
            'node_modules/',
            'cypress/screenshots/',
            'cypress/videos/',
            'cypress/downloads/',
            'reports/',
            'eslint.config.mjs',
        ],
    },

    js.configs.recommended,

    {
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: { ...globals.node, ...globals.browser },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'require-await': 'error',
            'no-return-await': 'error',
        },
    },

    {
        files: ['cypress/**/*.js'],
        ...cypress.configs.recommended,
        rules: {
            ...cypress.configs.recommended.rules,
            /**
             * The rules that matter here are the ones that catch a
             * misunderstanding of the command queue, not style:
             *
             *   no-assigning-return-values   `const el = cy.get(...)` does not
             *       give you an element. This is the mistake the Page Object
             *       Model makes especially easy — a field assigned in a
             *       constructor looks exactly right and is not.
             *   unsafe-to-chain-command      chaining off an action command
             *       re-queries a possibly detached element.
             *   no-async-tests               mixing async/await with the queue
             *       means the body finishes before the commands run.
             *   no-unnecessary-waiting       a fixed sleep instead of the real
             *       condition.
             */
            'cypress/no-assigning-return-values': 'error',
            'cypress/unsafe-to-chain-command': 'error',
            'cypress/no-async-tests': 'error',
            'cypress/no-unnecessary-waiting': 'error',
        },
    },

    prettier,
];
