import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { groq } from '@ai-sdk/groq';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// Create a simple mock model that returns predefined responses
const createMockModel = (name: string) => {
  return {
    generate: async ({ messages }) => {
      console.log(`Mock ${name} received messages:`, messages);
      return {
        text: `This is a mock response from ${name}. API keys are not configured. Please add XAI_API_KEY and GROQ_API_KEY to your environment variables.`,
      };
    },
  };
};

// Check if API keys are available
const hasXaiKey = !!process.env.XAI_API_KEY;
const hasGroqKey = !!process.env.GROQ_API_KEY;

console.log(`API keys available - xAI: ${hasXaiKey}, Groq: ${hasGroqKey}`);

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : !hasXaiKey || !hasGroqKey 
    ? customProvider({
        languageModels: {
          'chat-model': createMockModel('chat-model'),
          'chat-model-reasoning': createMockModel('chat-model-reasoning'),
          'title-model': createMockModel('title-model'),
          'artifact-model': createMockModel('artifact-model'),
        },
        imageModels: {
          'small-model': {
            generate: async () => ({ 
              url: 'https://placehold.co/600x400?text=Mock+Image+(No+API+Key)' 
            }),
          },
        },
      })
    : customProvider({
        languageModels: {
          'chat-model': xai('grok-2-1212'),
          'chat-model-reasoning': wrapLanguageModel({
            model: groq('deepseek-r1-distill-llama-70b'),
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
          }),
          'title-model': xai('grok-2-1212'),
          'artifact-model': xai('grok-2-1212'),
        },
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
