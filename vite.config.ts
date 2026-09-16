import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works from any subpath: GitHub Pages,
  // itch.io, or a plain folder, not just the root of a domain.
  base: './',
  server: {port: 5173},
});
