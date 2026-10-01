export default {
  preset: "ts-jest",
  testEnvironment: "node",
  // Testes de integração rodam svn e svnserve de verdade: 5 s é pouco em máquina carregada.
  testTimeout: 20000,
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/index.ts"
  ]
};
