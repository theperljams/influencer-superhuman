import { ChatCompletionModel } from './modelInterfaces';
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GoogleChatCompletion implements ChatCompletionModel {
  private genAI: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async getChatCompletion(systemPrompt: string, query: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-lite",
        systemInstruction: systemPrompt
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: query }] }],
        generationConfig: {
          temperature: 0.7,
        }
      });

      return result.response.text();
    } catch (error: any) {
      console.error('Error in Google getChatCompletion:', error);
      throw error;
    }
  }
}
