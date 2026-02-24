import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2015',
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/plugin/code.ts',
      formats: ['iife'],
      name: 'plugin',
      fileName: () => 'code.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'code.js',
      },
    },
  },
});
