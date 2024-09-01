<script>
	export let progress;
</script>

<div class="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
	<div
		class="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
		style="width: {progress}%"
	></div>
</div>
<p class="text-center text-sm text-gray-500 dark:text-gray-400">
	{progress.toFixed(1)}% complete
</p>
