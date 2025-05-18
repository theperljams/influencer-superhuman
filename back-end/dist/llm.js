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
exports.getEmbedding = void 0;
exports.processChatCompletion = processChatCompletion;
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const modelFactory_1 = require("./models/modelFactory");
dotenv_1.default.config();
// Configure which model types to use
const EMBEDDING_MODEL = modelFactory_1.EmbeddingModelType.OPENAI;
const CHAT_COMPLETION_MODEL = modelFactory_1.ChatCompletionModelType.GOOGLE; // or OPENAI
// Create model instances
const embeddingModel = modelFactory_1.ModelFactory.createEmbeddingModel(EMBEDDING_MODEL);
const chatCompletionModel = modelFactory_1.ModelFactory.createChatCompletionModel(CHAT_COMPLETION_MODEL);
const getEmbedding = (content) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield embeddingModel.getEmbedding(content);
    }
    catch (error) {
        console.error('Error in getEmbedding:', error);
        throw error;
    }
});
exports.getEmbedding = getEmbedding;
// Function to generate the system prompt using chunk text
function generateSystemPrompt(content, user_id, hashed_sender_name, timestamp) {
    return __awaiter(this, void 0, void 0, function* () {
        const contentEmbedding = yield (0, exports.getEmbedding)(content);
        const convoContext = yield (0, db_1.getCurrentConversationMessagesBySender)(hashed_sender_name);
        const personContext = yield (0, db_1.getMessagesByHashedSenderName)(hashed_sender_name, 10);
        const similarContextLegacy = yield (0, db_1.getContextLegacy)(contentEmbedding, user_id, 5, 0.7);
        const styleContextLegacy = yield (0, db_1.getContextLegacy)(contentEmbedding, user_id, 20, 0.3);
        const prompt = `You are an assistant drafting texts for ${user_id}. Respond to the given content as if you were
  sending a text from ${user_id}'s phone. Your goal is to sound as much like them as possible. These texts should reflect ${user_id}'s personality and way of speaking
  based on the context provided. You are given three samples of ${user_id}'s text conversations. The first one contains texts from the current conversation the user is having. 
  The second contains previous conversations with the person 
  ${user_id} is currently texting. The third one is various sample texts showing how ${user_id} texts in general and will likely contain some similar 
  conversations ${user_id} has had in the past. Contine the conversation as if you 
  were responding to another text from ${user_id}'s phone.
  
  Here is the text you are responding to: ${content}

  Here are the samples: 
  Current conversation: ${convoContext}

  Past conversations with current person: ${personContext} 
  
  Other past conversations: ${similarContextLegacy}
  ${styleContextLegacy}

  Craft a numbered list of 3 different responses in different contexts. Imitate ${user_id}'s style as shown in their sample texts. From these samples: infer ${user_id}'s 
  tone, style, values and beliefs, background and experience, personal preferences, writing habits, and emotional underpinning. Assume the audience is a good friend and 
  the purpose is just casual conversation. If one or both of the first two samples are left blank, do your best by relying on previous similar conversations from the third sample.
 DO NOT share any information not contained in the samples. If there is a text you don't know how to 
  respond to based on the samples, give 3 different "I don't know" responses that sound like something ${user_id} would say. You should ONLY rely on information that you know ${user_id} knows.`;
        console.log(prompt);
        return prompt;
    });
}
const hasNumericalCharacter = (inputString) => {
    return /\d/.test(inputString);
};
const parseNumberedList = (inputString) => {
    if (!hasNumericalCharacter(inputString)) {
        return [inputString];
    }
    const lines = inputString.trim().split('\n');
    const items = [];
    for (const line of lines) {
        const parts = line.split('. ', 2);
        if (parts.length === 2 && !isNaN(parseInt(parts[0], 10))) {
            const itemContent = parts[1].trim();
            items.push(itemContent);
        }
    }
    return items;
};
function processChatCompletion(query, user_id, hashed_sender_name, timestamp) {
    return __awaiter(this, void 0, void 0, function* () {
        const systemPrompt = yield generateSystemPrompt(query, user_id, hashed_sender_name, timestamp);
        const chatResponse = yield chatCompletionModel.getChatCompletion(systemPrompt, query);
        const responseList = parseNumberedList(chatResponse);
        console.log('Response:', responseList);
        return responseList;
    });
}
