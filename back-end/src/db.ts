import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { getEmbedding } from './llm';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_API_KEY) {
    throw new Error('Supabase URL and API Key must be set in environment variables.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_API_KEY);

export const insertQAPair = async (
  user_id: string,
  content: string,
  table_name: string
) => {
  let embedding = await getEmbedding(content);
  console.log("Inserting: ", user_id, content, table_name);
  const { data, error } = await supabase.from(table_name).insert({
    user_id,
    content,
    embedding
  });
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Inserted Data:", data);
  }
};

export async function fetchRetrievals(apiKey: string | undefined, content: string, user_id: string, top_k: number, max_chunks: number, rerank: boolean) {
  try {
    const response = await fetch("https://api.ragie.ai/retrievals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        "query": content,
        "top_k": top_k,
        "filter": {
          "user": user_id,
        },
        "rerank": rerank,
        "max_chunks_per_document": max_chunks
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching retrievals:", error);
    throw error;
  }
}
