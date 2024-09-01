<!-- src/lib/components/ChapterCard.svelte -->
<script>
	import { slide } from 'svelte/transition';
	import { parseMarkdown } from '$lib/utils/markdown';

	export let item;
	export let index;

	let expanded = true;

	function toggleExpand() {
		expanded = !expanded;
	}
</script>

<div class="card bg-base-100 shadow-xl mb-4 rounded-lg overflow-hidden w-full" data-index={index}>
	<div class="card-body p-0">
		<button class="w-full text-left p-4 bg-primary text-primary-content" on:click={toggleExpand}>
			<h2 class="card-title flex justify-between items-center">
				{item.title}
				<span class="transition-transform duration-300 {expanded ? 'rotate-180' : ''}">▼</span>
			</h2>
		</button>
		{#if expanded}
			<div class="p-4 prose max-w-none" transition:slide={{ duration: 300 }}>
				{@html parseMarkdown(item.content)}
			</div>
		{/if}
	</div>
</div>
