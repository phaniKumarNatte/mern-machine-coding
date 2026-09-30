// Runs before every test file (configured in vite.config.ts -> test.setupFiles).

// Adds DOM matchers such as toBeInTheDocument(), toHaveValue(), toBeDisabled().
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount whatever the previous test rendered, so every test starts with an empty page.
afterEach(() => {
  cleanup();
});
