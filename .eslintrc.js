module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin'],
    extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    ignorePatterns: ['.eslintrc.js'],
    rules: {
        'prettier/prettier': [
            'error',
            {
                singleQuote: false,
                trailingComma: 'all',
                semi: true,
                useTabs: false,
                arrowParens: 'avoid',
                printWidth: 120,
            },
        ],

        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-empty-interface': [
            "error",
            {
                "allowSingleExtends": false
            }
        ],

        "@typescript-eslint/consistent-type-imports": "warn",
        "@typescript-eslint/no-var-requires": "warn",
        "@typescript-eslint/no-this-alias": "warn",
        "@typescript-eslint/no-inferrable-types": "warn",
        "@typescript-eslint/ban-types": "warn",
        "@typescript-eslint/no-empty-function": "warn",
    },
};
