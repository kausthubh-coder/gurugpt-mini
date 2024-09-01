<script>
	import { onMount, getContext } from 'svelte';
	import ChapterCard from '$lib/components/ChapterCard.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import FloatingActionButton from '$lib/components/FloatingActionButton.svelte';
	import QuestionModal from '$lib/components/QuestionModal.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';

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
				throw new Error('Failed to get AI response');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let content = '';
			let responseReferences = [];

			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n\n');
				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = JSON.parse(line.slice(6));
						content = data.content;
						progress = data.progress;
						if (data.references) {
							responseReferences = data.references;
						}
					}
				}
			}

			isLoading = false;
			return { content, references: responseReferences };
		} catch (error) {
			console.error('Error fetching AI response:', error);
			isLoading = false;
			throw error;
		}
	}

	async function startLesson() {
		if (!topic) return;
		currentChapter = 1;
		const { content, references } = await getAIResponse(
			`
      Provide a comprehensive introduction to the topic: ${topic}. 
      This should be Chapter 1 of our lesson. 
      Include the following:
      1. A clear definition or explanation of ${topic}
      2. Its importance or relevance
      3. An overview of 3-5 key aspects or subtopics related to ${topic}
      4. A brief history or background of ${topic} (if applicable)
      Ensure the content is well-structured and easy to understand for a beginner.
    `,
			uploadedFiles
		);
		conversation = [
			{ role: 'teacher', content: `Chapter 1: Introduction to ${topic}\n\n${content}`, references }
		];
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

	async function continueLesson() {
		if (conversation.length === 0) return;
		currentChapter++;

		const previousChaptersSummary = summarizePreviousChapters(conversation);

		const { content, references } = await getAIResponse(
			`
    Continue the lesson on ${topic}. This should be Chapter ${currentChapter}. 
    
    Here's a brief summary of previous chapters:
    ${previousChaptersSummary}
    
    Based on this context, focus on the next logical subtopic or aspect of ${topic} that hasn't been covered yet. 
    Your response should include:
    1. A clear introduction to this new subtopic
    2. Detailed explanation of key concepts
    3. Examples or applications (if relevant)
    4. How this subtopic relates to the overall topic of ${topic} and previously discussed concepts
    
    Ensure the content is distinct from previous chapters, builds upon the existing knowledge, and provides a complete explanation of this subtopic. Avoid repeating information already covered in previous chapters.
  `,
			uploadedFiles
		);

		conversation = [
			...conversation,
			{ role: 'ai', content: `Chapter ${currentChapter}: ${content}`, references }
		];
	}

	async function askQuestion(question) {
		if (!question) return;
		const { content, references } = await getAIResponse(
			`The student has asked the following question about ${topic}: "${question}". Please provide a comprehensive answer in the context of our current lesson.`,
			uploadedFiles
		);
		conversation = [
			...conversation,
			{ role: 'qa', content: `Q: ${question}\n\nA: ${content}`, references }
		];
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
					{#each conversation as message, index}
						<div data-chapter={index + 1}>
							<ChapterCard {message} chapterIndex={index + 1} />
							{#if message.references && message.references.length > 0}
								<div class="mt-4 bg-base-200 p-4 rounded-lg shadow-md">
									<h4 class="font-medium mb-2">References:</h4>
									<ul class="list-disc list-inside space-y-2">
										{#each message.references as ref}
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
