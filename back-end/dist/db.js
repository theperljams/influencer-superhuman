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
exports.getMessagesUpToTimestamp = exports.getCurrentConversationMessagesBySender = exports.getCurrentConversationMessages = exports.getMessagesByHashedSenderName = exports.insertQAPair = exports.getUserData = exports.getContextLegacy = exports.getContextCurrent = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const llm_1 = require("./llm");
dotenv_1.default.config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;
if (!SUPABASE_URL || !SUPABASE_API_KEY) {
    throw new Error('Supabase URL and API Key must be set in environment variables.');
}
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_API_KEY);
const getContextCurrent = (embedding, user_id, match, similarity) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase.rpc('match_current', {
            match_count: match,
            query_embedding: embedding,
            similarity_threshold: similarity,
            userid: user_id
        });
        let result = [];
        for (const i in data)
            result.push(data[i].content);
        console.log(result);
        return result;
    }
    catch (error) {
        throw error;
    }
});
exports.getContextCurrent = getContextCurrent;
const getContextLegacy = (embedding, user_id, match, similarity) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase.rpc('match_legacy', {
            match_count: match,
            query_embedding: embedding,
            similarity_threshold: similarity,
            userid: user_id
        });
        let result = [];
        for (const i in data)
            result.push(data[i].content);
        return result;
    }
    catch (error) {
        throw error;
    }
});
exports.getContextLegacy = getContextLegacy;
const getUserData = (token) => __awaiter(void 0, void 0, void 0, function* () {
    const { data: { user } } = yield supabase.auth.getUser(token);
    return user;
});
exports.getUserData = getUserData;
const insertQAPair = (user_id, content, table_name, timestamp, sender_name) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(table_name);
    let embedding = yield (0, llm_1.getEmbedding)(content);
    console.log("Inserting: ", user_id, content, table_name, timestamp, sender_name);
    const { data, error } = yield supabase.from(table_name).insert({
        timestamp,
        user_id,
        content,
        embedding,
        sender_name
    });
    if (error) {
        console.error("Supabase Error:", error);
    }
    else {
        console.log("Inserted Data:", data);
    }
});
exports.insertQAPair = insertQAPair;
const getMessagesByHashedSenderName = (hashed_sender_name, limit) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { data, error } = yield supabase
            .from('pearl_message_test')
            .select('content') // Only select the 'content' column
            .eq('sender_name', hashed_sender_name)
            .order('timestamp', { ascending: false }) // Optional: Order by timestamp
            .limit(limit);
        if (error) {
            console.error('Error fetching messages by hashed_sender_name:', error);
            return null;
        }
        // Check if data is not null and is an array
        if (Array.isArray(data)) {
            // Transform the data to an array of strings
            const contentArray = data.map((row) => row.content);
            return contentArray;
        }
        else {
            // If data is null or not an array, return an empty array
            return [];
        }
    }
    catch (error) {
        console.error('Unexpected error fetching messages by hashed_sender_name:', error);
        return null;
    }
});
exports.getMessagesByHashedSenderName = getMessagesByHashedSenderName;
const getCurrentConversationMessages = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Step 1: Get the timestamp of the most recent message
        let { data: latestMessageData, error: latestMessageError } = yield supabase
            .from('pearl_message_test')
            .select('timestamp')
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();
        if (latestMessageError) {
            console.error('Error fetching the latest message timestamp:', latestMessageError);
            return null;
        }
        if (!latestMessageData) {
            console.log('No messages found.');
            return [];
        }
        const latestTimestamp = latestMessageData.timestamp;
        // Calculate the timestamp 5 minutes before the latest timestamp
        const fiveMinutesAgoTimestamp = latestTimestamp - 5 * 60 * 1000; // Subtract 5 minutes in milliseconds
        // Step 2: Get all messages within 5 minutes of the latest timestamp
        let { data: messagesData, error: messagesError } = yield supabase
            .from('pearl_message_test')
            .select('content')
            .gte('timestamp', fiveMinutesAgoTimestamp)
            .order('timestamp', { ascending: true });
        if (messagesError) {
            console.error('Error fetching messages within 5 minutes:', messagesError);
            return null;
        }
        if (!messagesData) {
            return [];
        }
        const contentArray = messagesData.map((row) => row.content);
        return contentArray;
    }
    catch (error) {
        console.error('Unexpected error fetching current conversation messages:', error);
        return null;
    }
});
exports.getCurrentConversationMessages = getCurrentConversationMessages;
const getCurrentConversationMessagesBySender = (hashed_sender_name) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Step 1: Get the timestamp of the most recent message from the specific sender
        let { data: latestMessageData, error: latestMessageError } = yield supabase
            .from('pearl_message_test')
            .select('timestamp')
            .eq('sender_name', hashed_sender_name)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();
        if (latestMessageError) {
            console.error('Error fetching the latest message timestamp for the sender:', latestMessageError);
            return null;
        }
        if (!latestMessageData) {
            console.log('No messages found for the specified sender.');
            return [];
        }
        const latestTimestamp = latestMessageData.timestamp;
        // Calculate the timestamp 5 minutes before the latest timestamp
        const fiveMinutesAgoTimestamp = latestTimestamp - 5 * 60 * 1000; // Subtract 5 minutes in milliseconds
        // Step 2: Get all messages within 5 minutes of the latest timestamp
        let { data: messagesData, error: messagesError } = yield supabase
            .from('pearl_message_test')
            .select('content')
            .gte('timestamp', fiveMinutesAgoTimestamp)
            .lte('timestamp', latestTimestamp)
            .order('timestamp', { ascending: true });
        if (messagesError) {
            console.error('Error fetching messages within 5 minutes of the sender\'s latest message:', messagesError);
            return null;
        }
        if (!messagesData) {
            return [];
        }
        // Transform the data to an array of strings
        const contentArray = messagesData.map((row) => row.content);
        return contentArray;
    }
    catch (error) {
        console.error('Unexpected error fetching current conversation messages by sender:', error);
        return null;
    }
});
exports.getCurrentConversationMessagesBySender = getCurrentConversationMessagesBySender;
const getMessagesUpToTimestamp = (timestamp, limit) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { data, error } = yield supabase
            .from('pearl_message_test')
            .select('*')
            .lte('timestamp', timestamp)
            .order('timestamp', { ascending: false }) // Optional: Order by timestamp
            .limit(limit);
        if (error) {
            console.error('Error fetching messages up to timestamp:', error);
            return null;
        }
        return data;
    }
    catch (error) {
        console.error('Unexpected error fetching messages up to timestamp:', error);
        return null;
    }
});
exports.getMessagesUpToTimestamp = getMessagesUpToTimestamp;
