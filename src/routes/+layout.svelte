<!-- src/routes/+layout.svelte -->
<script>
	import '../app.pcss';
	import { theme } from '$lib/utils/theme';
	import Navbar from '$lib/components/Navbar.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { setContext } from 'svelte';

	let sidebarOpen = false;

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	onMount(() => {
		document.documentElement.setAttribute('data-theme', $theme);
	});

	$: if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', $theme);
	}

	const conversationStore = writable([]);

	// Function to update the conversation store
	function updateConversation(newConversation) {
		conversationStore.set(newConversation);
	}

	// Set the context for child components
	setContext('conversation', {
		conversationStore,
		updateConversation
	});
</script>

<div class="min-h-screen bg-base-100 text-base-content flex flex-col" data-theme={$theme}>
	<Navbar {toggleSidebar} />
	<div class="flex flex-1 pt-16">
		<!-- Sidebar -->
		<aside
			class="bg-base-200 w-64 fixed h-full overflow-auto transition-transform duration-300 ease-in-out lg:translate-x-0 {sidebarOpen
				? 'translate-x-0'
				: '-translate-x-full'} z-30"
		>
			<TableOfContents conversation={$conversationStore} />
		</aside>

		<!-- Main Content -->
		<main class="flex-1 p-4 lg:ml-64">
			<slot {updateConversation} />
		</main>
	</div>
</div>

<style>
	:global(html, body) {
		height: 100%;
	}
</style>
