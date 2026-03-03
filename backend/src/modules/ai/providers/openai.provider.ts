import OpenAI from 'openai';
import { env } from '../../../config/env';
import { IAIProvider, AIMessage, AIResponse } from './base.provider';

export class OpenAIProvider implements IAIProvider {
  name = 'OPENAI';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY || '',
    });
  }

  async chat(messages: AIMessage[], systemPrompt: string): Promise<AIResponse> {
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ];

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: openaiMessages,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
        : undefined,
    };
  }
}
