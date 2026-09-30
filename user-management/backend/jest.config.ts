import type { Config } from 'jest';

const config: Config = {
  // ts-jest compiles our TypeScript test files on the fly.
  preset: 'ts-jest',

  // Backend code runs in Node, not in a browser, so we don't need jsdom.
  testEnvironment: 'node',

  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],

  // Before every test:
  //   resetMocks   -> wipe every jest.fn()'s recorded calls AND its fake implementation
  //                   (mockResolvedValue etc.), so one test's setup can't leak into the next.
  //   restoreMocks -> put back the real functions replaced with jest.spyOn().
  resetMocks: true,
  restoreMocks: true,

  // Integration tests start an in-memory MongoDB; the first run may need to
  // download the mongod binary, so give tests more than the default 5s.
  testTimeout: 30000,

  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};

export default config;
