import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// One config file for both Vite (dev server / build) and Vitest (tests).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development, the browser calls /api/... on the Vite server (port 5173)
    // and Vite forwards it to Express (port 5000). Same origin => no CORS issues.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  test: {
    // jsdom gives tests a fake browser DOM (document, window) inside Node.
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Before every test: reset every vi.fn() (calls + fake return values) and
    // restore real functions replaced by vi.spyOn(). Same idea as the backend's Jest config.
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
