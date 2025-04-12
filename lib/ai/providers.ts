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
    generate: async ({ messages }: { messages: any[] }) => {
      console.log(`Mock ${name} received messages:`, messages);
      return {
        text: `This is a mock response from ${name}. API keys are not configured. Please add XAI_API_KEY and GROQ_API_KEY to your environment variables.`,
      };
    },
  };
};

// Albanian language enforcer middleware
const albanianLanguageMiddleware = () => {
  return async (params: any, runModel: any) => {
    // Add Albanian system message if not already present
    if (params.messages && Array.isArray(params.messages)) {
      // Check if there's already a system message
      const hasSystemMessage = params.messages.some(
        (msg: any) => msg.role === 'system'
      );
      
      // If no system message exists, add one at the beginning
      if (!hasSystemMessage) {
        params.messages.unshift({
          role: 'system',
          content: 'Ti je Ilirion AI, një asistent që flet vetëm shqip. Nuk je i lejuar të flasësh asnjë gjuhë tjetër përveç shqipes. Nëse pyetja nuk është në shqip, ti duhet të përgjigjesh vetëm në shqip duke thënë se flet vetëm shqip.'
        });
      }
    }

    const result = await runModel(params);

    // Default Albanian response for non-Albanian inputs
    const albanianResponse = "Më vjen keq, unë jam Ilirion AI dhe flas vetëm shqip. Jam krenar për origjinën time shqiptare dhe trashëgiminë ilire. Ju lutem, komunikoni me mua në gjuhën shqipe.";

    // Always ensure the response text is in Albanian
    // This is a more robust check to detect non-Albanian text
    // Albanian text should have special characters like 'ë', 'ç', etc.
    const containsAlbanianCharacters = 
      result.text.includes('ë') || 
      result.text.includes('Ë') || 
      result.text.includes('ç') || 
      result.text.includes('Ç');
      
    // Additional check for common Albanian words
    const commonAlbanianWords = ['unë', 'është', 'dhe', 'për', 'nga', 'më', 'të', 'në'];
    const containsAlbanianWords = commonAlbanianWords.some(word => 
      result.text.toLowerCase().includes(word)
    );
      
    // If response doesn't contain Albanian characters or common words, force Albanian response
    if (!containsAlbanianCharacters && !containsAlbanianWords) {
      console.log("Enforcing Albanian response - detected non-Albanian text");
      return {
        ...result,
        text: albanianResponse,
      };
    }

    return result;
  };
};

// Check if API keys are available - safely access environment variables
const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] as string | undefined;
  }
  return undefined;
};

const hasXaiKey = !!getEnvVar('XAI_API_KEY');
const hasGroqKey = !!getEnvVar('GROQ_API_KEY');

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
          'chat-model': wrapLanguageModel({
            model: xai('grok-2-1212'),
            middleware: albanianLanguageMiddleware(),
          }),
          'chat-model-reasoning': wrapLanguageModel({
            model: groq('deepseek-r1-distill-llama-70b'),
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
          }),
          'title-model': wrapLanguageModel({
            model: xai('grok-2-1212'),
            middleware: albanianLanguageMiddleware(),
          }),
          'artifact-model': wrapLanguageModel({
            model: xai('grok-2-1212'),
            middleware: albanianLanguageMiddleware(),
          }),
        },
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
