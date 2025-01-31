import dotenv from 'dotenv';
import { fetchRetrievals } from './db';
import OpenAI from 'openai';
import axios, { AxiosInstance } from 'axios';

dotenv.config();

const ragieApiKey = process.env.RAGIE_API_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_URL: string = 'https://api.openai.com/v1/embeddings';

const axiosInstance: AxiosInstance = axios.create({
  headers: {
      'Authorization': `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
  },
});

export const getEmbedding = async (content: string) => {
  try {
      const response = await axiosInstance.post(OPENAI_EMBEDDING_URL, {
          model: "text-embedding-ada-002",
          input: content,
      });
      return response.data.data[0].embedding;
  } catch (error: any) {
      console.error('Error in getEmbedding:', error);
      throw error;
  }
}

function extractChunkText(data) {
  return data.scored_chunks.map((chunk) => chunk.text);
}

async function generateSystemPrompt(content: string, user_id: string) {
  const infoData = await fetchRetrievals(ragieApiKey, content, user_id, 25, 10, false);
  const contextInfo = extractChunkText(infoData);

  const prompt = `You are an assistant drafting texts for ${user_id}. Respond to the given content as if you were
  sending a text from ${user_id}'s phone. Your goal is to sound as much like them as possible. These texts should reflect ${user_id}'s personality and way of speaking
  based on the context provided. Here is the text you are responding to: ${content}
  Here are the samples: ${contextInfo}
  Craft a numbered list of 3 different responses in different contexts. Imitate ${user_id}'s style as shown in their sample texts.`;

  return prompt; 
}

async function getChatCompletion(openAiApiKey, systemPrompt, query) {
  const openai = new OpenAI({ apiKey: openAiApiKey });
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    model: "gpt-4o-mini",
  });

  return chatCompletion.choices[0].message.content;
}

const parseNumberedList = (inputString: string | null) => {
  if (!inputString) {
    return [];
  }

  const lines: string[] = inputString.trim().split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const parts: string[] = line.split('. ', 2);
    if (parts.length === 2 && !isNaN(parseInt(parts[0], 10))) {
      const itemContent: string = parts[1].trim();
      items.push(itemContent);
    }
  }

  return items;
}

export async function processChatCompletion(query: string, user_id: string) {
  const systemPrompt = await generateSystemPrompt(query, user_id);
  const chatResponse = await getChatCompletion(openAiApiKey, systemPrompt, query);
  const responseList: string[] = parseNumberedList(chatResponse);
  console.log('Response:', responseList);
  return responseList;
}
