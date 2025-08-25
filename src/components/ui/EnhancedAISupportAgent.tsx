// Enhanced AI Support Agent - Fully Integrated with Gemini AI
// Bismillah Ar-Rahman Ar-Roheem

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Loader2,
  Plus,
  MoreVertical,
  Download,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  AlertCircle,
  Info,
  Sparkles,
  Heart,
  Shield
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { githubDB, collections } from '../../lib/database';
import { geminiAI } from '../../lib/ai/gemini-service';

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  sessionId: string;
  feedback?: 'positive' | 'negative';
  metadata?: {
    confidence?: number;
    sources?: string[];
    followUpSuggestions?: string[];
    medicalDisclaimer?: boolean;
    isEmergency?: boolean;
  };
}

interface ChatSession {
  id: string;
  userId?: string;
  name: string;
  messages: ChatMessage[];
  context: {
    userProfile?: any;
    healthConcerns?: string[];
    preferences?: any;
  };
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

const EnhancedAISupportAgent: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic conversation starters based on platform capabilities
  const conversationStarters = [
    "How can I help with your health concerns today?",
    "Tell me about any symptoms you're experiencing",
    "What health information are you looking for?",
    "Do you need help navigating our health tools?",
    "Questions about appointments or services?",
    "Need guidance on preventive care?",
    "How can I support your wellness journey?"
  ];

  useEffect(() => {
    loadSessions();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [sessions, isLoading]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const loadSessions = async () => {
    try {
      let userSessions: ChatSession[] = [];
      
      if (user) {
        userSessions = await githubDB.find(collections.ai_chat_sessions, { userId: user.id });
      } else {
        // For anonymous users, check localStorage
        const localSessions = localStorage.getItem('ai_chat_sessions');
        if (localSessions) {
          userSessions = JSON.parse(localSessions);
        }
      }
      
      const sortedSessions = userSessions.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
      
      setSessions(sortedSessions);
      
      if (sortedSessions.length > 0) {
        setCurrentSessionId(sortedSessions[0].id);
      } else {
        await createNewSession();
      }
    } catch (error) {
      console.warn('Failed to load sessions:', error);
      await createNewSession();
    }
  };

  const createNewSession = async () => {
    const sessionId = `ai-chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newSession: ChatSession = {
      id: sessionId,
      userId: user?.id,
      name: `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      context: {},
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    };

    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: `Welcome to CareConnect AI Assistant! 🏥✨\n\nI'm here to help you with:\n• Health information and guidance\n• Symptom assessment and triage\n• Navigation of our health tools\n• General wellness support\n• Platform assistance\n\nHow can I assist you today?`,
      isBot: true,
      timestamp: new Date(),
      sessionId,
      metadata: {
        medicalDisclaimer: true,
        followUpSuggestions: conversationStarters.slice(0, 3)
      }
    };

    newSession.messages.push(welcomeMessage);

    try {
      if (user) {
        await githubDB.insert(collections.ai_chat_sessions, newSession);
      } else {
        // Store in localStorage for anonymous users
        const localSessions = JSON.parse(localStorage.getItem('ai_chat_sessions') || '[]');
        localSessions.push(newSession);
        localStorage.setItem('ai_chat_sessions', JSON.stringify(localSessions));
      }
      
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(sessionId);
      setSuggestions(conversationStarters.slice(0, 4));
    } catch (error) {
      console.error('Error creating new session:', error);
      setError('Failed to create new chat session');
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const message = currentMessage.trim();
    setCurrentMessage('');
    setIsLoading(true);
    setIsThinking(true);
    setError(null);

    try {
      const session = sessions.find(s => s.id === currentSessionId);
      if (!session) {
        throw new Error('No active session found');
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        content: message,
        isBot: false,
        timestamp: new Date(),
        sessionId: currentSessionId!
      };

      // Generate AI response
      const aiResponse = await generateAIResponse(session, message);
      
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        content: aiResponse.content,
        isBot: true,
        timestamp: new Date(),
        sessionId: currentSessionId!,
        metadata: aiResponse.metadata
      };

      // Update session
      const updatedSession = {
        ...session,
        messages: [...session.messages, userMessage, aiMessage],
        lastActivity: new Date()
      };

      // Save to database or localStorage
      if (user) {
        await githubDB.update(collections.ai_chat_sessions, currentSessionId!, updatedSession);
      } else {
        const localSessions = JSON.parse(localStorage.getItem('ai_chat_sessions') || '[]');
        const sessionIndex = localSessions.findIndex((s: ChatSession) => s.id === currentSessionId);
        if (sessionIndex !== -1) {
          localSessions[sessionIndex] = updatedSession;
          localStorage.setItem('ai_chat_sessions', JSON.stringify(localSessions));
        }
      }

      // Update state
      setSessions(prev => prev.map(s => s.id === currentSessionId ? updatedSession : s));
      setSuggestions(aiResponse.metadata?.followUpSuggestions || []);

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  const generateAIResponse = async (session: ChatSession, userMessage: string): Promise<{
    content: string;
    metadata: any;
  }> => {
    try {
      // Build conversation context
      const conversationHistory = session.messages
        .slice(-8) // Last 8 messages for context
        .map(msg => `${msg.isBot ? 'Assistant' : 'User'}: ${msg.content}`)
        .join('\n');

      // System prompt for CareConnect AI Assistant
      const systemPrompt = `You are the CareConnect AI Assistant, a helpful and empathetic healthcare support AI for the CareConnect platform. You provide:

1. Health information and guidance (educational only)
2. Symptom assessment and triage recommendations
3. Platform navigation assistance
4. General wellness support
5. Appointment and service guidance

SAFETY GUIDELINES:
- Always include medical disclaimers for health-related advice
- Never provide specific medical diagnoses
- Recommend consulting healthcare professionals for serious concerns
- Recognize emergency situations immediately
- Be empathetic, supportive, and non-judgmental
- Provide evidence-based information only

EMERGENCY KEYWORDS: chest pain, difficulty breathing, severe bleeding, unconscious, overdose, suicide, self-harm

PLATFORM CONTEXT:
CareConnect is a comprehensive healthcare platform offering:
- Health tools and calculators
- Telemedicine services
- Appointment booking
- Health records management
- Educational resources
- Community support`;

      // Check for emergency keywords
      const emergencyKeywords = [
        'emergency', 'urgent', 'severe pain', 'chest pain', 'difficulty breathing',
        'suicide', 'self-harm', 'overdose', 'poisoning', 'severe bleeding',
        'unconscious', 'not breathing', 'heart attack', 'stroke'
      ];

      const hasEmergencyKeyword = emergencyKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasEmergencyKeyword) {
        return {
          content: `🚨 **EMERGENCY ALERT** 🚨\n\nI've detected that your message may indicate a medical emergency. Please take immediate action:\n\n• **Call emergency services immediately** (911 in the US, 999 in the UK)\n• **Go to the nearest emergency room**\n• **Contact your healthcare provider urgently**\n\nThis AI assistant cannot handle emergency situations. Your safety is the absolute priority.\n\n*This information is for educational purposes only and cannot replace emergency medical care.*`,
          metadata: {
            isEmergency: true,
            medicalDisclaimer: true,
            followUpSuggestions: ['Contact emergency services', 'Visit emergency room', 'Call your doctor immediately']
          }
        };
      }

      // Build full prompt
      const fullPrompt = `${systemPrompt}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT USER MESSAGE: ${userMessage}

Please provide a helpful, accurate, and safe response. Include medical disclaimers when appropriate and suggest relevant CareConnect platform features when helpful.`;

      // Generate response using Gemini
      const response = await geminiAI.generateContent(fullPrompt);

      // Add medical disclaimer if health-related
      const needsDisclaimer = /health|medical|symptom|diagnosis|treatment|medication|pain|illness|disease|doctor|hospital/i.test(userMessage);
      let finalContent = response;
      
      if (needsDisclaimer) {
        finalContent += `\n\n---\n*This information is for educational purposes only and should not replace professional medical advice. Please consult with a healthcare provider for personalized medical guidance.*`;
      }

      // Generate contextual follow-up suggestions
      const followUpSuggestions = generateFollowUpSuggestions(userMessage, response);

      return {
        content: finalContent,
        metadata: {
          confidence: 0.85,
          medicalDisclaimer: needsDisclaimer,
          followUpSuggestions,
          sources: ['CareConnect AI Assistant', 'Gemini AI']
        }
      };

    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        content: 'I apologize, but I encountered an error while processing your message. Please try again or contact our support team if the issue persists.\n\n*For urgent medical concerns, please contact your healthcare provider or emergency services.*',
        metadata: {
          error: true,
          medicalDisclaimer: true,
          followUpSuggestions: ['Try asking again', 'Contact support', 'Visit help center']
        }
      };
    }
  };

  const generateFollowUpSuggestions = (userMessage: string, aiResponse: string): string[] => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('symptom')) {
      return [
        'Tell me more about your symptoms',
        'How long have you been experiencing this?',
        'Would you like to use our symptom checker tool?'
      ];
    } else if (message.includes('appointment')) {
      return [
        'Help me book an appointment',
        'What types of appointments are available?',
        'How do I reschedule an appointment?'
      ];
    } else if (message.includes('medication')) {
      return [
        'Tell me about drug interactions',
        'How do I manage my medications?',
        'What are common side effects?'
      ];
    } else if (message.includes('nutrition') || message.includes('diet')) {
      return [
        'Create a meal plan for me',
        'What are healthy eating tips?',
        'Help with dietary restrictions'
      ];
    } else {
      return [
        'What other health topics interest you?',
        'How else can I help you today?',
        'Would you like to explore our health tools?'
      ];
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getCurrentSession = () => {
    return sessions.find(s => s.id === currentSessionId);
  };

  const currentSession = getCurrentSession();

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 group"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
          </div>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            CareConnect AI Assistant
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bot className="w-6 h-6" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="font-semibold text-sm">CareConnect AI</h3>
              <p className="text-xs text-green-100">Healthcare Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-green-500 rounded transition-colors"
              aria-label={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-green-500 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {currentSession?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[80%] ${
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
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        
                        {message.metadata?.isEmergency && (
                          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-xs text-red-700 font-medium">Emergency Alert</span>
                          </div>
                        )}
                        
                        {message.metadata?.medicalDisclaimer && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-yellow-600" />
                            <span className="text-xs text-yellow-700">Medical Disclaimer Applied</span>
                          </div>
                        )}
                        
                        <div className="text-xs opacity-70 mt-1">
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
              
              {isThinking && (
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

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your health..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isLoading}
                  className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Heart className="w-3 h-3 text-red-500" />
                  <span>Powered by Gemini AI</span>
                </div>
                <button
                  onClick={createNewSession}
                  className="text-xs text-green-600 hover:text-green-700 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Chat</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedAISupportAgent;