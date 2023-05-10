import type { JestConfigWithTsJest } from 'ts-jest'

const jestConfig: JestConfigWithTsJest = {
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  setupFiles: [
      "<rootDir>/tests/test-setup.ts"
  ],
}

export default jestConfig