// src/routes/api/upload/+server.js
import { json } from '@sveltejs/kit';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
	console.error('Missing required environment variables');
	throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const embeddings = new OpenAIEmbeddings({ openAIApiKey: openaiApiKey });

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export async function POST({ request }) {
	console.log('Upload request received');
	const data = await request.formData();
	const file = data.get('file');

	if (!file) {
		console.error('No file uploaded');
		return json({ error: 'No file uploaded' }, { status: 400 });
	}

	const filename = file.name;
	const uploadDir = join(process.cwd(), 'uploads');
	const filePath = join(uploadDir, filename);

	try {
		await mkdir(uploadDir, { recursive: true });

		const fileStream = file.stream();
		const writeStream = createWriteStream(filePath);

		await pipeline(fileStream, writeStream);

		console.log(`File saved to: ${filePath}`);

		// Read the file contents
		const fileContent = await readFileContent(filePath);

		// Split the content into smaller chunks
		const textSplitter = new RecursiveCharacterTextSplitter({
			chunkSize: CHUNK_SIZE,
			chunkOverlap: CHUNK_OVERLAP
		});

		const docs = await textSplitter.createDocuments([fileContent]);

		for (let i = 0; i < docs.length; i++) {
			const chunk = docs[i];

			// Sanitize the content
			const sanitizedContent = sanitizeContent(chunk.pageContent);

			// Generate embedding for the chunk
			const [embedding] = await embeddings.embedDocuments([sanitizedContent]);

			// Store chunk in Supabase
			const { data: document, error } = await supabase
				.from('documents')
				.insert({
					id: uuidv4(),
					content: sanitizedContent,
					metadata: {
						...chunk.metadata,
						filename,
						type: file.type,
						chunk: i + 1,
						totalChunks: docs.length
					},
					embedding
				})
				.select();

			if (error) {
				console.error(`Error storing chunk ${i + 1} in Supabase:`, error);
				throw error;
			}

			console.log(`Chunk ${i + 1}/${docs.length} processed and stored`);
		}

		return json({ success: true, filename });
	} catch (error) {
		console.error('Error processing file:', error);
		return json({ error: 'Could not process file' }, { status: 500 });
	}
}

async function readFileContent(filePath) {
	const buffer = await readFile(filePath);
	return buffer.toString('utf-8');
}

function sanitizeContent(content) {
	// Remove null characters and other non-printable characters
	return content.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}
