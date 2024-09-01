<script>
	import { slide } from 'svelte/transition';
	import { parseMarkdown } from '$lib/utils/markdown';

	export let message;
	export let chapterIndex;

	let expanded = true;
	let title;
	let content;

	function toggleExpand() {
		expanded = !expanded;
	}

	$: {
		if (message.role === 'qa') {
			title = 'Q&A';
			content = message.content;
		} else {
			const lines = message.content.split('\n');
			title = lines[0].replace(/^Chapter \d+: /, '').trim();
			content = lines.slice(1).join('\n').trim();
		}
	}
</script>

<div class="card bg-base-100 shadow-xl mb-4 rounded-lg overflow-hidden w-full">
	<div class="card-body p-0">
		<button class="w-full text-left p-4 bg-primary text-primary-content" on:click={toggleExpand}>
			<h2 class="card-title flex justify-between items-center">
				{message.role === 'qa' ? 'Q&A' : `Chapter ${chapterIndex}: ${title}`}
				<span class="transition-transform duration-300 {expanded ? 'rotate-180' : ''}">▼</span>
			</h2>
		</button>
		{#if expanded}
			<div class="p-4 prose max-w-none" transition:slide={{ duration: 300 }}>
				{@html parseMarkdown(content)}
			</div>
		{/if}
	</div>
</div>
