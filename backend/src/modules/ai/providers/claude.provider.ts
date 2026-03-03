import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../config/env';
import { IAIProvider, AIMessage, AIResponse } from './base.provider';

export class ClaudeProvider implements IAIProvider {
  name = 'CLAUDE';
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY || '',
    });
  }

  async chat(messages: AIMessage[], systemPrompt: string): Promise<AIResponse> {
    const filteredMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: filteredMessages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');

    return {
      content: textBlock?.text || '',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
