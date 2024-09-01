<!-- src/lib/components/Navbar.svelte -->
<script>
	import ThemeToggle from './ThemeToggle.svelte';

	export let toggleSidebar;
</script>

<nav class="bg-base-200 p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
	<div class="flex items-center">
		<button class="lg:hidden mr-2" on:click={toggleSidebar}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				/>
			</svg>
		</button>
		<h1 class="text-2xl font-bold text-primary">GuruGPT</h1>
	</div>
	<ThemeToggle />
</nav>
