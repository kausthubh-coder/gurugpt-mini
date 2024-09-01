import { writable } from 'svelte/store';

// Initialize the theme based on user's preference or default to 'dark'
const userTheme = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null;
export const theme = writable(userTheme || 'dark');

// Subscribe to changes and update localStorage
if (typeof window !== 'undefined') {
	theme.subscribe((value) => {
		window.localStorage.setItem('theme', value);
	});
}
