import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/has-this-ever-been-litigated/',
  plugins: [react()],
});
