<script>
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	let files = [];
	let uploading = false;
	let uploadProgress = 0;
	let uploadStatus = '';
	let processingProgress = 0;

	async function handleFileSelect(event) {
		const selectedFiles = Array.from(event.target.files);
		uploading = true;
		uploadProgress = 0;
		processingProgress = 0;
		uploadStatus = 'Starting upload...';

		for (const file of selectedFiles) {
			const formData = new FormData();
			formData.append('file', file);

			try {
				const response = await fetch('/api/upload', {
					method: 'POST',
					body: formData
				});

				if (!response.ok) {
					throw new Error('File upload failed');
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder();

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value);
					const lines = chunk.split('\n\n');
					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = JSON.parse(line.slice(6));
							processingProgress = data.progress;
							uploadStatus = `Uploading ${file.name}: 100% | Processing: ${processingProgress.toFixed(2)}%`;
						}
					}
				}

				uploadStatus = `Uploaded and processed ${file.name}`;
				files = [...files, { name: file.name, type: file.type }];
				dispatch('upload', [{ name: file.name, type: file.type }]);
			} catch (error) {
				console.error('Error uploading file:', error);
				uploadStatus = `Error uploading ${file.name}: ${error.message}`;
			}
		}

		uploading = false;
	}
</script>

<div class="">
	<label class="btn btn-primary">
		<svg
			width="24px"
			height="24px"
			stroke-width="1.5"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			color="#ffffff"
		>
			<!-- SVG path data here -->
		</svg>
		<input
			type="file"
			multiple
			on:change={handleFileSelect}
			class="hidden"
			accept=".pdf,.txt,.doc,.docx,.csv,.json"
		/>
		Upload Files
	</label>
	{#if uploading}
		<div class="mt-4 bg-base-200 p-4 rounded-lg shadow-md" transition:fade>
			<p class="mb-2">{uploadStatus}</p>
			<div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
				<div
					class="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
					style="width: {uploadProgress}%"
				></div>
			</div>
			<div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
				<div
					class="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
					style="width: {processingProgress}%"
				></div>
			</div>
		</div>
	{/if}
	{#if files.length > 0}
		<ul class="mt-4 space-y-2">
			{#each files as file}
				<li class="bg-base-200 p-2 rounded-md flex items-center justify-between">
					<span>{file.name}</span>
					<span class="text-sm text-gray-500">({file.type})</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
