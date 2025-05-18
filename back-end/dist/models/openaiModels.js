"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIChatCompletion = exports.OpenAIEmbedding = void 0;
const openai_1 = __importDefault(require("openai"));
const axios_1 = __importDefault(require("axios"));
const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';
class OpenAIEmbedding {
    constructor(apiKey) {
        this.axiosInstance = axios_1.default.create({
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
    }
    getEmbedding(content) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.axiosInstance.post(OPENAI_EMBEDDING_URL, {
                    model: "text-embedding-3-small",
                    input: content,
                    encoding_format: "float",
                });
                return response.data.data[0].embedding;
            }
            catch (error) {
                console.error('Error in OpenAI getEmbedding:', error);
                throw error;
            }
        });
    }
}
exports.OpenAIEmbedding = OpenAIEmbedding;
class OpenAIChatCompletion {
    constructor(apiKey) {
        this.client = new openai_1.default({
            apiKey: apiKey,
        });
    }
    getChatCompletion(systemPrompt, query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const completion = yield this.client.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: query }
                    ],
                    temperature: 0.7,
                });
                return completion.choices[0].message.content || "";
            }
            catch (error) {
                console.error('Error in OpenAI getChatCompletion:', error);
                throw error;
            }
        });
    }
}
exports.OpenAIChatCompletion = OpenAIChatCompletion;
