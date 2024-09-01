<!-- src/lib/components/TableOfContents.svelte -->
<script>
	export let conversation = [];

	function jumpToChapter(index) {
		const chapterElement = document.querySelector(`[data-chapter="${index + 1}"]`);
		if (chapterElement) {
			chapterElement.scrollIntoView({ behavior: 'smooth' });
		}
	}
</script>

<nav class="p-4">
	<h2 class="text-xl font-bold mb-4">Table of Contents</h2>
	{#if conversation && conversation.length > 0}
		<ul class="space-y-2">
			{#each conversation as message, index}
				{#if message.role !== 'qa'}
					<li>
						<button
							class="text-left w-full p-2 rounded hover:bg-base-300 transition-colors"
							on:click={() => jumpToChapter(index)}
						>
							Chapter {index + 1}: {message.content.split('\n')[0].replace(/^Chapter \d+: /, '')}
						</button>
					</li>
				{/if}
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-base-content/70">
			No chapters yet. Start a lesson to see the table of contents.
		</p>
	{/if}
</nav>
