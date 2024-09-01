// src/routes/api/openai/+server.js
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
	console.error('Missing required environment variables');
	throw new Error('Missing required environment variables');
}

const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, supabaseKey);
const embeddings = new OpenAIEmbeddings({ openAIApiKey: openaiApiKey });

export async function POST({ request }) {
	const { prompt, model = 'gpt-4-turbo-preview', max_tokens = 2000 } = await request.json();

	try {
		console.log('Received prompt:', prompt);

		const encoder = new TextEncoder();
		const readable = new ReadableStream({
			async start(controller) {
				// Send initial progress
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 0 })}\n\n`));

				// Generate embedding for the query
				const [queryEmbedding] = await embeddings.embedDocuments([prompt]);
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 10 })}\n\n`));

				// Retrieve relevant documents from Supabase
				const { data: documents, error } = await supabase.rpc('match_documents', {
					query_embedding: queryEmbedding,
					match_threshold: 0.78,
					match_count: 5
				});

				if (error) throw error;
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 20 })}\n\n`));

				// Prepare context from retrieved documents
				const context = documents.map((doc) => doc.content).join('\n\n');
				console.log('Retrieved context:', context);
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 30 })}\n\n`));

				// Prepare messages for OpenAI
				const messages = [
					{
						role: 'system',
						content: 'You are a helpful assistant. Use the provided context to answer questions.'
					},
					{
						role: 'user',
						content: `Context: ${context}\n\nQuestion: ${prompt}`
					}
				];

				const stream = await openai.chat.completions.create({
					model,
					messages,
					max_tokens,
					temperature: 0.7,
					stream: true
				});

				let content = '';
				let totalTokens = 0;
				for await (const chunk of stream) {
					const token = chunk.choices[0]?.delta?.content || '';
					content += token;
					totalTokens++;
					const progress = Math.min(30 + (totalTokens / max_tokens) * 70, 100);
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ content, progress, references: documents })}\n\n`
						)
					);
				}
				controller.close();
			}
		});

		return new Response(readable, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (error) {
		console.error('Error in RAG process:', error);
		return json({ error: 'Failed to process request' }, { status: 500 });
	}
}
