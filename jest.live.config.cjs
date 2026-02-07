const baseConfig = require("./jest.config.cjs");

/** @type {import("jest").Config} */
module.exports = {
  ...baseConfig,
  testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
  testPathIgnorePatterns: [],
};
