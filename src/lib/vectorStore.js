// src/lib/vectorStore.js
import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const embeddings = new OpenAIEmbeddings();

export async function addDocumentToVectorStore(document) {
	const { content, metadata } = document;
	const embedding = await embeddings.embedQuery(content);

	const { data, error } = await supabase
		.from('documents')
		.insert({ content, metadata, embedding })
		.select();

	if (error) throw error;
	return data[0];
}

export async function getRelevantDocuments(query, match_threshold = 0.78, match_count = 10) {
	const queryEmbedding = await embeddings.embedQuery(query);

	const { data, error } = await supabase.rpc('match_documents', {
		query_embedding: queryEmbedding,
		match_threshold,
		match_count
	});

	if (error) throw error;
	return data;
}
