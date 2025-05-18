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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleChatCompletion = void 0;
const generative_ai_1 = require("@google/generative-ai");
class GoogleChatCompletion {
    constructor(apiKey) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    getChatCompletion(systemPrompt, query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const model = this.genAI.getGenerativeModel({
                    model: "gemini-2.0-flash-lite",
                    systemInstruction: systemPrompt
                });
                const result = yield model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: query }] }],
                    generationConfig: {
                        temperature: 0.7,
                    }
                });
                return result.response.text();
            }
            catch (error) {
                console.error('Error in Google getChatCompletion:', error);
                throw error;
            }
        });
    }
}
exports.GoogleChatCompletion = GoogleChatCompletion;
