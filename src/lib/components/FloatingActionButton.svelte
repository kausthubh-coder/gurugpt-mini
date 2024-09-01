<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	export let isLoading;
</script>

<div class="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
	<button
		class="btn btn-lg btn-primary w-48"
		on:click={() => dispatch('continue')}
		disabled={isLoading}
	>
		Continue
	</button>
	<button
		class="btn btn-lg btn-secondary w-48"
		on:click={() => dispatch('question')}
		disabled={isLoading}
	>
		Ask Question
	</button>
</div>
