import { EmbeddingModel, ChatCompletionModel} from './modelInterfaces';
import { OpenAIEmbedding, OpenAIChatCompletion } from './openaiModels';
import { GoogleChatCompletion } from './googleModels';
import { CebrasChatCompletion } from './cerebrasModels';
import dotenv from 'dotenv';

dotenv.config();

export enum EmbeddingModelType {
  OPENAI = 'openai',
  // Add more embedding model types as needed
}

export enum ChatCompletionModelType {
  OPENAI = 'openai',
  GOOGLE = 'google',
  CEREBRAS = 'cerebras',
  // Add more chat completion model types as needed
}

export class ModelFactory {
  static createEmbeddingModel(modelType: EmbeddingModelType): EmbeddingModel {
    switch (modelType) {
      case EmbeddingModelType.OPENAI:
        return new OpenAIEmbedding(process.env.OPENAI_API_KEY || '');
      default:
        throw new Error(`Unsupported embedding model type: ${modelType}`);
    }
  }

  static createChatCompletionModel(modelType: ChatCompletionModelType): ChatCompletionModel {
    switch (modelType) {
      case ChatCompletionModelType.OPENAI:
        return new OpenAIChatCompletion(process.env.OPENAI_API_KEY || '');
      case ChatCompletionModelType.GOOGLE:
        return new GoogleChatCompletion(process.env.GOOGLE_API_KEY || '');
      case ChatCompletionModelType.CEREBRAS:
        return new CebrasChatCompletion(process.env.CEREBRAS_API_KEY || '');
      default:
        throw new Error(`Unsupported chat completion model type: ${modelType}`);
    }
  }

}
