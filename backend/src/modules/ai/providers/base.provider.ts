export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface IAIProvider {
  name: string;
  chat(messages: AIMessage[], systemPrompt: string): Promise<AIResponse>;
}
