"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelFactory = exports.ChatCompletionModelType = exports.EmbeddingModelType = void 0;
const openaiModels_1 = require("./openaiModels");
const googleModels_1 = require("./googleModels");
const cerebrasModels_1 = require("./cerebrasModels");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
var EmbeddingModelType;
(function (EmbeddingModelType) {
    EmbeddingModelType["OPENAI"] = "openai";
    // Add more embedding model types as needed
})(EmbeddingModelType || (exports.EmbeddingModelType = EmbeddingModelType = {}));
var ChatCompletionModelType;
(function (ChatCompletionModelType) {
    ChatCompletionModelType["OPENAI"] = "openai";
    ChatCompletionModelType["GOOGLE"] = "google";
    ChatCompletionModelType["CEREBRAS"] = "cerebras";
    // Add more chat completion model types as needed
})(ChatCompletionModelType || (exports.ChatCompletionModelType = ChatCompletionModelType = {}));
class ModelFactory {
    static createEmbeddingModel(modelType) {
        switch (modelType) {
            case EmbeddingModelType.OPENAI:
                return new openaiModels_1.OpenAIEmbedding(process.env.OPENAI_API_KEY || '');
            default:
                throw new Error(`Unsupported embedding model type: ${modelType}`);
        }
    }
    static createChatCompletionModel(modelType) {
        switch (modelType) {
            case ChatCompletionModelType.OPENAI:
                return new openaiModels_1.OpenAIChatCompletion(process.env.OPENAI_API_KEY || '');
            case ChatCompletionModelType.GOOGLE:
                return new googleModels_1.GoogleChatCompletion(process.env.GOOGLE_API_KEY || '');
            case ChatCompletionModelType.CEREBRAS:
                return new cerebrasModels_1.CebrasChatCompletion(process.env.CEREBRAS_API_KEY || '');
            default:
                throw new Error(`Unsupported chat completion model type: ${modelType}`);
        }
    }
}
exports.ModelFactory = ModelFactory;
