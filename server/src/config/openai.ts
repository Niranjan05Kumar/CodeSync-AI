import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY || '';
const isPlaceholder = !apiKey || apiKey.includes('your_openai_api_key_here') || apiKey.startsWith('sk-proj-your_');

export const isOpenAIConfigured = (): boolean => {
  return !isPlaceholder && apiKey.length > 20;
};

export const openai = isOpenAIConfigured()
  ? new OpenAI({ apiKey })
  : null;

export const DEFAULT_AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
