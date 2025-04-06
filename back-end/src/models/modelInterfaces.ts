export interface EmbeddingModel {
  getEmbedding(content: string): Promise<number[]>;
}

export interface ChatCompletionModel {
  getChatCompletion(systemPrompt: string, query: string): Promise<string>;
}
