<!-- src/lib/components/TableOfContents.svelte -->
<script>
	export let conversation = [];

	function jumpToChapter(index) {
		const element = document.querySelector(`[data-index="${index}"]`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
	}
</script>

<nav class="p-4">
	<h2 class="text-xl font-bold mb-4">Table of Contents</h2>
	{#if conversation.length > 0}
		<ul class="space-y-2">
			{#each conversation as item, index}
				{#if item.role === 'chapter'}
					<li>
						<button
							class="text-left w-full p-2 rounded hover:bg-base-300 transition-colors"
							on:click={() => jumpToChapter(index)}
						>
							{item.title}
						</button>
					</li>
				{/if}
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-base-content/70">
			No content yet. Start a lesson to see the table of contents.
		</p>
	{/if}
</nav>
