module.exports = {
  rootDir: '.',

  roots: ['<rootDir>/src', '<rootDir>/test'],

  moduleFileExtensions: ['js', 'json', 'ts'],

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  setupFiles: ['<rootDir>/test/jest.setup.cjs'],

  testRegex: '(\\.spec|\\.e2e-spec)\\.ts$',

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
        },
      },
    ],
  },

  extensionsToTreatAsEsm: ['.ts'],

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
