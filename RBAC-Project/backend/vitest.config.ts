import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        // mongodb-memory-server downloads/starts a real mongod binary on first run,
        // which can take well over the 5s default — generous timeouts avoid flaky CI.
        testTimeout: 30000,
        hookTimeout: 60000,
    },
});
