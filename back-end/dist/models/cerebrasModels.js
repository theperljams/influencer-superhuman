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
exports.CebrasChatCompletion = void 0;
const cerebras_cloud_sdk_1 = __importDefault(require("@cerebras/cerebras_cloud_sdk"));
class CebrasChatCompletion {
    constructor(apiKey, model = 'llama3.1-8b') {
        this.client = new cerebras_cloud_sdk_1.default({
            apiKey: apiKey,
        });
        this.model = model;
    }
    getChatCompletion(systemPrompt, query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const chatCompletion = yield this.client.chat.completions.create({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: query }
                    ],
                    model: this.model,
                    temperature: 0.7,
                });
                return ((_b = (_a = chatCompletion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            }
            catch (error) {
                console.error('Error in Cerebras getChatCompletion:', error);
                throw error;
            }
        });
    }
}
exports.CebrasChatCompletion = CebrasChatCompletion;
