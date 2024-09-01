<script>
	import { createEventDispatcher } from 'svelte';

	export let show = false;
	let question = '';
	const dispatch = createEventDispatcher();

	function handleSubmit() {
		dispatch('submit', question);
		question = '';
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-base-100 p-6 rounded-lg w-96">
			<h2 class="text-xl font-bold mb-4">Ask a Question</h2>
			<textarea
				bind:value={question}
				class="w-full h-32 p-2 mb-4 border rounded"
				placeholder="Type your question here..."
			></textarea>
			<div class="flex justify-end">
				<button class="btn btn-primary mr-2" on:click={handleSubmit}>Submit</button>
				<button class="btn" on:click={() => (show = false)}>Cancel</button>
			</div>
		</div>
	</div>
{/if}
