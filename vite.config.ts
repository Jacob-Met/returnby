import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { rolldownOptions: { input: { main: 'index.html', manual: 'manual-entry.html' } } } });
