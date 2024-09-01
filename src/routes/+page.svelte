<script>
	import { onMount, getContext } from 'svelte';
	import ChapterCard from '$lib/components/ChapterCard.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import FloatingActionButton from '$lib/components/FloatingActionButton.svelte';
	import QuestionModal from '$lib/components/QuestionModal.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { parseMarkdown } from '$lib/utils/markdown';

	const { conversationStore, updateConversation } = getContext('conversation');

	let topic = '';
	let conversation = [];
	let isLoading = false;
	let inputElement;
	let currentChapter = 0;
	let progress = 0;
	let showQuestionModal = false;
	let uploadedFiles = [];

	async function getAIResponse(prompt, references = []) {
		console.log('Getting AI response for prompt:', prompt);
		isLoading = true;
		progress = 0;
		try {
			const response = await fetch('/api/openai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ prompt, references })
			});

			if (!response.ok) {
				throw new Error(`Failed to get AI response: ${response.statusText}`);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let content = '';
			let responseReferences = [];
			let buffer = '';

			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						try {
							const data = JSON.parse(line.slice(6));
							content = data.content || content;
							progress = data.progress || progress;
							if (data.references) {
								responseReferences = data.references;
							}
							console.log('Received chunk:', { content, progress, references: responseReferences });
						} catch (parseError) {
							console.warn('Error parsing chunk:', parseError, 'Raw chunk:', line);
							// Continue processing other chunks
						}
					}
				}
			}

			// Process any remaining data in the buffer
			if (buffer.startsWith('data: ')) {
				try {
					const data = JSON.parse(buffer.slice(6));
					content = data.content || content;
					progress = data.progress || progress;
					if (data.references) {
						responseReferences = data.references;
					}
				} catch (parseError) {
					console.warn('Error parsing final chunk:', parseError, 'Raw chunk:', buffer);
				}
			}

			console.log('AI response completed:', { content, references: responseReferences });
			return { content, references: responseReferences };
		} catch (error) {
			console.error('Error fetching AI response:', error);
			throw error;
		} finally {
			isLoading = false;
		}
	}

	async function startLesson() {
		if (!topic) return;
		const { content, references } = await getAIResponse(
			`Provide a comprehensive introduction to the topic: ${topic}. Start with a title in the format "Chapter 1: [Brief Title]", followed by the content.`
		);
		const title = extractTitle(content);
		conversation = [
			{
				role: 'chapter',
				title: title,
				content: content.replace(title, '').trim(), // Remove the title from the content
				references: references
			}
		];
	}

	async function continueLesson() {
		if (conversation.length === 0) return;
		const chapterNumber = conversation.filter((msg) => msg.role === 'chapter').length + 1;
		const { content, references } = await getAIResponse(
			`Continue the lesson on ${topic}. This should be Chapter ${chapterNumber}. Start with a title in the format "Chapter ${chapterNumber}: [Brief Title]", followed by the content.`
		);
		const title = extractTitle(content);
		conversation = [
			...conversation,
			{
				role: 'chapter',
				title: title,
				content: content.replace(title, '').trim(), // Remove the title from the content
				references: references
			}
		];
	}

	async function askQuestion(question) {
		if (!question) return;
		isLoading = true;
		try {
			const { content, references } = await getAIResponse(
				`Answer the following question about ${topic}: "${question}"`
			);
			conversation = [
				...conversation,
				{
					role: 'qa',
					title: `Q&A: ${question}`,
					content: `Q: ${question}\n\nA: ${content}`,
					references: references
				}
			];
			console.log('Updated conversation:', conversation);
		} catch (error) {
			console.error('Error asking question:', error);
		} finally {
			isLoading = false;
		}
	}

	function extractTitle(content) {
		const match = content.match(/^Chapter \d+:.*$/m);
		return match ? match[0].trim() : `Chapter ${conversation.length + 1}: Untitled`;
	}

	function summarizePreviousChapters(conversation, maxLength = 500) {
		let summary = '';
		for (let i = 0; i < conversation.length; i++) {
			if (conversation[i].role === 'ai') {
				const chapterContent = conversation[i].content.split('\n\n')[1]; // Get content after chapter title
				summary += `Chapter ${i + 1} summary: ${chapterContent.substring(0, 100)}...\n`;
			}
		}
		return summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary;
	}

	function handleKeydown(event) {
		if (isLoading || showQuestionModal) return;
		if (event.key === 'Enter' && !event.ctrlKey && document.activeElement !== inputElement) {
			event.preventDefault();
			continueLesson();
		} else if (event.key === 'Enter' && event.ctrlKey) {
			event.preventDefault();
			showQuestionModal = true;
		}
	}

	function handleQuestionSubmit(event) {
		const question = event.detail;
		askQuestion(question);
		showQuestionModal = false;
	}

	function handleFileUpload(event) {
		uploadedFiles = [...uploadedFiles, ...event.detail];
	}

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function handleInputKeydown(event) {
		if (event.key === 'Enter' && !isLoading) {
			event.preventDefault();
			startLesson();
		}
	}

	function jumpToChapter(chapterIndex) {
		const chapterElement = document.querySelector(`[data-chapter="${chapterIndex + 1}"]`);
		if (chapterElement) {
			chapterElement.scrollIntoView({ behavior: 'smooth' });
		}
	}

	$: {
		updateConversation(conversation);
	}

	onMount(() => {
		const savedTheme = localStorage.getItem('theme') || 'light';
		document.documentElement.setAttribute('data-theme', savedTheme);
	});
</script>

<svelte:head>
	<title>GuruGPT</title>
</svelte:head>

<QuestionModal bind:show={showQuestionModal} on:submit={handleQuestionSubmit} />

<svelte:window on:keydown={handleKeydown} />

<div class="flex flex-col min-h-screen bg-base-100">
	<main class="flex-grow container mx-auto p-4">
		<div class="flex flex-col lg:flex-row gap-8">
			<!-- Main Content -->
			<div class="flex-grow">
				<!-- Topic Input, File Upload, and Start Button -->
				<div class="flex flex-col sm:flex-row gap-4 mb-8 items-end">
					<input
						class="input input-bordered flex-1"
						bind:value={topic}
						placeholder="Enter a topic"
						on:keydown={handleInputKeydown}
						bind:this={inputElement}
					/>
					<FileUpload on:upload={handleFileUpload} />
					<button class="btn btn-primary" on:click={startLesson} disabled={isLoading}>
						Start Lesson
					</button>
				</div>

				<!-- Progress Indicator -->
				{#if isLoading}
					<div class="mb-8">
						<ProgressBar {progress} />
					</div>
				{/if}

				<!-- Welcome Message -->
				{#if conversation.length === 0}
					<div class="text-center py-12 bg-base-200 rounded-lg shadow-md">
						<h2 class="text-2xl font-bold mb-4">Welcome to GuruGPT!</h2>
						<p class="mb-4">Enter a topic above to start your personalized lesson.</p>
						<p>Upload relevant files to enhance your learning experience.</p>
					</div>
				{/if}

				<!-- Conversation / Chapters -->
				<div class="space-y-8">
					{#each conversation as item, index}
						<div data-index={index}>
							{#if item.role === 'chapter'}
								<ChapterCard {item} {index} />
							{:else if item.role === 'qa'}
								<div class="card bg-base-200 shadow-xl mb-4 rounded-lg overflow-hidden w-full">
									<div class="card-body">
										<h2 class="card-title">{item.title}</h2>
										<div class="prose">
											{@html parseMarkdown(item.content)}
										</div>
									</div>
								</div>
							{/if}
							{#if item.references && item.references.length > 0}
								<div class="mt-4 bg-base-200 p-4 rounded-lg shadow-md">
									<h4 class="font-medium mb-2">References:</h4>
									<ul class="list-disc list-inside space-y-2">
										{#each item.references as ref}
											<li class="text-sm">
												<span class="font-medium">Score: {ref.similarity.toFixed(4)}</span>
												<br />
												<span class="text-xs">{ref.content.substring(0, 100)}...</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</main>

	<!-- Floating Action Button -->
	{#if conversation.length > 0}
		<FloatingActionButton
			on:continue={continueLesson}
			on:question={() => (showQuestionModal = true)}
			{isLoading}
		/>
	{/if}
</div>
