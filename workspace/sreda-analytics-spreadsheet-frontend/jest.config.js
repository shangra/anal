// jest.config.js
module.exports = {
    clearMocks: true,
    testEnvironment: 'jsdom',
    // setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'], // Optional: for custom matchers
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Handle CSS imports
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js', // Handle image imports
    },
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest', // Or 'ts-jest' if using TypeScript
    },
    testMatch: ['<rootDir>/src/**/*(*.)@(spec|test).[tj]s?(x)'],
    transformIgnorePatterns: ['/node_modules/device-uuid/'],
};
