import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY || '';
const baseURL = process.env.OPENAI_BASE_URL || undefined;

const isPlaceholder = !apiKey || 
  apiKey.includes('your_openai_api_key_here') || 
  apiKey.startsWith('sk-proj-your_');

export const isOpenAIConfigured = (): boolean => {
  return !isPlaceholder && apiKey.trim().length > 5;
};

export const openai = isOpenAIConfigured()
  ? new OpenAI({
      apiKey: apiKey.trim(),
      baseURL: baseURL || undefined
    })
  : null;

// Determine smart default model based on endpoint provider
function getDefaultModel(): string {
  if (process.env.OPENAI_MODEL) {
    return process.env.OPENAI_MODEL;
  }
  if (baseURL?.includes('groq.com')) {
    return 'llama-3.3-70b-versatile';
  }
  if (baseURL?.includes('googleapis.com')) {
    return 'gemini-2.0-flash';
  }
  if (baseURL?.includes('openrouter.ai')) {
    return 'meta-llama/llama-3.3-70b-instruct:free';
  }
  return 'gpt-4o-mini';
}

export const DEFAULT_AI_MODEL = getDefaultModel();
