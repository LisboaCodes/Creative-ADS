import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import {
  Bot,
  Send,
  Plus,
  Loader2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
// Card components available if needed
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import ChatMessage from '../components/ai/ChatMessage';
import ActionCard from '../components/ai/ActionCard';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  structuredData?: { actions?: any[] };
}

interface Conversation {
  id: string;
  title: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  _count?: { messages: number; actions: number };
}

interface AIAction {
  id: string;
  type: string;
  status: string;
  campaignId?: string;
  parameters?: any;
  reason?: string;
}

export default function AIAgent() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState('CLAUDE');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch conversations list
  const { data: conversations } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: async () => {
      const response = await api.get('/api/ai/conversations');
      return response.data.data as Conversation[];
    },
  });

  // Fetch selected conversation
  const { data: currentConversation } = useQuery({
    queryKey: ['ai-conversation', selectedConversation],
    queryFn: async () => {
      const response = await api.get(`/api/ai/conversations/${selectedConversation}`);
      return response.data.data;
    },
    enabled: !!selectedConversation,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (msg: string) => {
      const response = await api.post('/api/ai/chat', {
        message: msg,
        conversationId: selectedConversation || undefined,
        provider,
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      if (!selectedConversation) {
        setSelectedConversation(data.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      queryClient.invalidateQueries({
        queryKey: ['ai-conversation', data.conversationId],
      });
      setMessage('');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || 'Erro ao enviar mensagem para a IA'
      );
    },
  });

  // Approve action
  const handleApprove = async (actionId: string) => {
    setLoadingAction(actionId);
    try {
      await api.post(`/api/ai/actions/${actionId}/approve`);
      toast.success('Ação aprovada e executada com sucesso!');
      queryClient.invalidateQueries({
        queryKey: ['ai-conversation', selectedConversation],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao aprovar ação');
    } finally {
      setLoadingAction(null);
    }
  };

  // Reject action
  const handleReject = async (actionId: string) => {
    setLoadingAction(actionId);
    try {
      await api.post(`/api/ai/actions/${actionId}/reject`);
      toast.success('Ação rejeitada');
      queryClient.invalidateQueries({
        queryKey: ['ai-conversation', selectedConversation],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao rejeitar ação');
    } finally {
      setLoadingAction(null);
    }
  };

  // New conversation
  const handleNewConversation = () => {
    setSelectedConversation(null);
  };

  // Send message
  const handleSend = () => {
    if (!message.trim() || sendMessage.isPending) return;
    sendMessage.mutate(message.trim());
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  // Build messages + actions for display
  const messages: Message[] = currentConversation?.messages || [];
  const actions: AIAction[] = currentConversation?.actions || [];

  // Map actions by their position (after each assistant message with structured data)
  const getActionsForMessage = (msg: Message): AIAction[] => {
    if (msg.role !== 'assistant' || !msg.structuredData?.actions) return [];
    // Match actions to this conversation - show all actions
    return actions;
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Sidebar - Conversations */}
      <div className="hidden md:flex flex-col w-72 border rounded-lg bg-card">
        <div className="p-3 border-b">
          <Button
            onClick={handleNewConversation}
            className="w-full"
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Conversa
          </Button>
        </div>

        {/* Provider selector */}
        <div className="p-3 border-b">
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLAUDE">Claude (Anthropic)</SelectItem>
              <SelectItem value="OPENAI">GPT-4 (OpenAI)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations && conversations.length > 0 ? (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                  selectedConversation === conv.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate font-medium">
                    {conv.title || 'Nova conversa'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-muted-foreground">
                    {new Date(conv.updatedAt).toLocaleDateString('pt-BR')}
                  </span>
                  {conv._count && conv._count.actions > 0 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {conv._count.actions} ações
                    </Badge>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhuma conversa ainda
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Agente de Tráfego IA</h2>
              <p className="text-xs text-muted-foreground">
                Analisa campanhas e sugere otimizações
              </p>
            </div>
          </div>

          {/* Mobile provider selector */}
          <div className="md:hidden">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLAUDE">Claude</SelectItem>
                <SelectItem value="OPENAI">GPT-4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !sendMessage.isPending && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Agente de Tráfego IA
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mb-6">
                Envie uma mensagem para analisar suas campanhas, obter insights e
                receber sugestões de otimização.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'Analise minhas campanhas',
                  'Quais campanhas devo pausar?',
                  'Como melhorar meu ROAS?',
                  'Resumo do desempenho geral',
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMessage(suggestion);
                      sendMessage.mutate(suggestion);
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatMessage
                role={msg.role}
                content={msg.content}
                createdAt={msg.createdAt}
              />

              {/* Show action cards after assistant messages */}
              {msg.role === 'assistant' && msg.structuredData?.actions && (
                <div className="ml-11 mt-2 space-y-2">
                  {getActionsForMessage(msg).map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      loading={loadingAction === action.id}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {sendMessage.isPending && (
            <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Analisando suas campanhas...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="flex-1 min-h-[44px] max-h-32 resize-none rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={1}
              disabled={sendMessage.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              size="icon"
              className="h-[44px] w-[44px]"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pressione Enter para enviar. Shift+Enter para nova linha.
          </p>
        </div>
      </div>
    </div>
  );
}
