module.exports = {
    moduleFileExtensions: ['js', 'ts'],
    testMatch: ['**/*.test.ts'],
    transform: {
      '^.+\\.ts$': 'ts-jest'
    },
    verbose: true,
    collectCoverage: true,
    coverageThreshold:{
      global:{
        lines: 100
      }      
    }
  }