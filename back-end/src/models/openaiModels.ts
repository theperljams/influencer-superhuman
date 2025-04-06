import { EmbeddingModel, ChatCompletionModel} from './modelInterfaces';
import OpenAI from 'openai';
import axios, { AxiosInstance } from 'axios';


const OPENAI_EMBEDDING_URL: string = 'https://api.openai.com/v1/embeddings';

export class OpenAIEmbedding implements EmbeddingModel {
  private axiosInstance: AxiosInstance;
  
  constructor(apiKey: string) {
    this.axiosInstance = axios.create({
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getEmbedding(content: string): Promise<number[]> {
    try {
      const response = await this.axiosInstance.post(OPENAI_EMBEDDING_URL, {
        model: "text-embedding-3-small",
        input: content,
        encoding_format: "float",
      });
      return response.data.data[0].embedding;
    } catch (error: any) {
      console.error('Error in OpenAI getEmbedding:', error);
      throw error;
    }
  }
}

export class OpenAIChatCompletion implements ChatCompletionModel {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
    });
  }

  async getChatCompletion(systemPrompt: string, query: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        temperature: 0.7,
      });
      
      return completion.choices[0].message.content || "";
    } catch (error: any) {
      console.error('Error in OpenAI getChatCompletion:', error);
      throw error;
    }
  }
}


