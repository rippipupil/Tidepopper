import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' para que funcione igual en GitHub Pages (subcarpeta) y dentro del APK.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});
