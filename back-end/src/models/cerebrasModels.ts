import { ChatCompletionModel } from './modelInterfaces';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

export class CebrasChatCompletion implements ChatCompletionModel {
  private client: Cerebras;
  private model: string;
  
  constructor(apiKey: string, model: string = 'llama3.1-8b') {
    this.client = new Cerebras({
      apiKey: apiKey,
    });
    this.model = model;
  }

  async getChatCompletion(systemPrompt: string, query: string): Promise<string> {
    try {
      const chatCompletion = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        model: this.model,
        temperature: 0.7,
      }) as { choices: { message: { content: string } }[] };
      
      return chatCompletion.choices[0]?.message?.content || "";
    } catch (error: any) {
      console.error('Error in Cerebras getChatCompletion:', error);
      throw error;
    }
  }
}
