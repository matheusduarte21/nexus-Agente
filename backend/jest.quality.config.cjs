module.exports = {
    rootDir: '.',

    roots: ['<rootDir>/src', '<rootDir>/test'],

    moduleFileExtensions: ['js', 'json', 'ts'],

    testRegex: '(\\.spec|\\.e2e-spec)\\.ts$',

    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },

    testEnvironment: 'node',

    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.d.ts',
        '!src/main.ts',
    ],

    coverageDirectory: '<rootDir>/coverage',

    coverageReporters: ['text', 'lcov', 'json-summary', 'html'],

    coverageThreshold: {
        global: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
        },
    },
};
