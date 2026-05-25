import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api': {
				target: 'https://api.eulhane.com/asangp',
				changeOrigin: true,
				secure: false
			}
		}
	}
});
