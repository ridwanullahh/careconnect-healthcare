// Health Tool AI Chat Component - Fully Agentic Chat Experience
// Bismillah Ar-Rahman Ar-Roheem

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Heart,
  Shield,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  masterHealthToolsService,
  HealthTool,
  ChatMessage,
  ToolChatSession
} from '../../lib/health-tools-master';

interface HealthToolAIChatProps {
  tool: HealthTool;
  sessionId: string;
  className?: string;
}

const HealthToolAIChat: React.FC<HealthToolAIChatProps> = ({ tool, sessionId, className = '' }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<ToolChatSession | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages]);

  const loadSession = async () => {
    setIsInitializing(true);
    try {
      let loadedSession = await masterHealthToolsService.getChatSession(sessionId);
      if (loadedSession && loadedSession.messages.length === 0) {
        loadedSession = await masterHealthToolsService.triggerInitialResponse(sessionId);
      }
      setSession(loadedSession);
    } catch (error) {
      console.error('Failed to load chat session:', error);
      setError('Failed to load chat. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading || !session) return;

    const message = currentMessage.trim();
    setCurrentMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const aiMessage = await masterHealthToolsService.sendChatMessage(session.id, message);
      
      // Update session with new messages
      const updatedSession = await masterHealthToolsService.getChatSession(session.id);
      if (updatedSession) {
        setSession(updatedSession);
      }
      
      // Update tool usage
      await masterHealthToolsService.updateToolUsage(tool.id);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentMessage(suggestion);
    inputRef.current?.focus();
  };

  const restartChat = async () => {
    // This should ideally create a new session and update the parent component
    // For now, we'll just reload the current one
    await loadSession();
  };

  if (isInitializing) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Initializing AI Chat...</span>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Unavailable</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadSession}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bot className="w-6 h-6" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-semibold">{tool.name} AI Assistant</h3>
              <p className="text-sm text-blue-100">Powered by Gemini AI</p>
            </div>
          </div>
          <button
            onClick={restartChat}
            className="p-2 hover:bg-green-500 rounded-lg transition-colors"
            title="Start New Chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {session?.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[85%] ${
              message.isBot 
                ? 'bg-white border border-gray-200' 
                : 'bg-green-600 text-white'
            } rounded-lg p-3 shadow-sm`}>
              <div className="flex items-start space-x-2">
                {message.isBot && (
                  <div className="flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-green-600" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  
                  {message.metadata?.isEmergency && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-700 font-medium">Emergency Alert</span>
                      </div>
                    </div>
                  )}
                  
                  {message.metadata?.medicalDisclaimer && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center space-x-2">
                      <Shield className="w-3 h-3 text-yellow-600" />
                      <span className="text-xs text-yellow-700">Medical disclaimer applied</span>
                    </div>
                  )}
                  
                  {message.metadata?.followUpSuggestions && message.metadata.followUpSuggestions.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-600 mb-2">Suggested follow-ups:</div>
                      <div className="space-y-1">
                        {message.metadata.followUpSuggestions.slice(0, 3).map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="block w-full text-left text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs opacity-70 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                {!message.isBot && (
                  <div className="flex-shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-green-600" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border-t border-red-200">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${tool.name} AI anything...`}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!currentMessage.trim() || isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Heart className="w-3 h-3 text-red-500" />
            <span>Powered by Gemini AI • Always consult healthcare professionals</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <MessageSquare className="w-3 h-3" />
            <span>{session?.messages.length || 0} messages</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthToolAIChat;