// Enhanced AI Support Agent with Gemini Integration
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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  sessionId: string;
  feedback?: 'positive' | 'negative';
}

interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

const AISupportAgent: React.FC = () => {
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
  const [isThinking, setIsThinking] = useState(false); // For "AI is thinking" animation
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      try {
        const parsedSessions = JSON.parse(savedSessions);
        // Convert date strings back to Date objects
        const formattedSessions = parsedSessions.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          lastActivity: new Date(session.lastActivity),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setSessions(formattedSessions);
        if (formattedSessions.length > 0) {
          setCurrentSessionId(formattedSessions[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error('Failed to parse saved sessions', e);
        createNewSession();
      }
    } else {
      // Initialize with a default session
      createNewSession();
    }
  }, []);

  // Save sessions to localStorage when they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    scrollToBottom();
  }, [sessions, isLoading]);

  // Set initial suggestions for chat
  useEffect(() => {
    setSuggestions([
      "Find a healthcare provider near me",
      "How do I use the symptom checker?",
      "What courses are available for diabetes?",
      "How can I donate to healthcare causes?"
    ]);
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      name: `Chat ${sessions.length + 1}`,
      messages: [
        {
          id: crypto.randomUUID(),
          content: "Hello! I'm your CareConnect AI assistant. I can help you navigate the platform, find healthcare providers, understand health tools, and answer questions about our services. How can I assist you today?",
          isBot: true,
          timestamp: new Date(),
          sessionId: ''
        }
      ],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    newSession.messages[0].sessionId = newSession.id;
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    
    // Reset suggestions when creating a new session
    setSuggestions([
      "Find a healthcare provider near me",
      "How do I use the symptom checker?",
      "What courses are available for diabetes?",
      "How can I donate to healthcare causes?"
    ]);
  };

  const getCurrentSession = () => {
    return sessions.find(s => s.id === currentSessionId);
  };

  const sendMessage = async (message: string = currentMessage) => {
    if (!message.trim() || !currentSessionId) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: message,
      isBot: false,
      timestamp: new Date(),
      sessionId: currentSessionId
    };

    // Add user message
    setSessions(prev => prev.map(session => 
      session.id === currentSessionId 
        ? { 
            ...session, 
            messages: [...session.messages, userMessage],
            lastActivity: new Date()
          }
        : session
    ));

    setCurrentMessage('');
    setError(null);
    setIsLoading(true);
    setIsThinking(true); // Start thinking animation
    
    // Clear suggestions once user sends a message
    setSuggestions([]);

    // Delay the API call slightly to show the thinking animation
    setTimeout(async () => {
      try {
        setIsThinking(false); // Stop thinking animation when API call starts
        
        // Generate response using Gemini API
        const response = await generateAIResponse(message, getCurrentSession());
        
        const botMessage: ChatMessage = {
          id: crypto.randomUUID(),
          content: response.message,
          isBot: true,
          timestamp: new Date(),
          sessionId: currentSessionId
        };

        setSessions(prev => prev.map(session => 
          session.id === currentSessionId 
            ? { 
                ...session, 
                messages: [...session.messages, botMessage],
                lastActivity: new Date(),
                name: message.length > 20 ? `${message.substring(0, 20)}...` : message
              }
            : session
        ));
        
        // Set follow-up suggestions if provided
        if (response.suggestions && response.suggestions.length > 0) {
          setSuggestions(response.suggestions);
        }
      } catch (error) {
        console.error('AI response failed:', error);
        setError('I\'m having trouble connecting right now. Please try again in a moment.');
        
        // Still add an error message to the chat
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment or contact our support team for immediate assistance.",
          isBot: true,
          timestamp: new Date(),
          sessionId: currentSessionId
        };

        setSessions(prev => prev.map(session => 
          session.id === currentSessionId 
            ? { 
                ...session, 
                messages: [...session.messages, errorMessage],
                lastActivity: new Date()
              }
            : session
        ));
      } finally {
        setIsLoading(false);
      }
    }, 600); // Show the thinking animation for at least 600ms
  };

  const generateAIResponse = async (message: string, session: ChatSession | undefined): Promise<{message: string, suggestions?: string[]}> => {
    try {
      // Use the real Gemini API
      const apiKeys = (import.meta.env.VITE_GEMINI_API_KEYS || '').split(',').filter(key => key.trim());
      if (apiKeys.length === 0) {
        throw new Error('No Gemini API keys configured');
      }
      
      // Use rotating API keys for load balancing
      const currentKeyIndex = Math.floor(Math.random() * apiKeys.length);
      const apiKey = apiKeys[currentKeyIndex].trim();
      
      // Build context from previous messages
      const contextMessages = session?.messages.slice(-6).map(msg => 
        `${msg.isBot ? 'Assistant' : 'User'}: ${msg.content}`
      ).join('\n') || '';
      
      // Enhanced system prompt with more capabilities
      const systemPrompt = `You are a sophisticated AI assistant for the CareConnect Healthcare Platform. Your primary goal is to provide comprehensive, empathetic, and accurate guidance to users, helping them navigate the platform and access the healthcare resources they need.

**Platform Overview:**

*   **Healthcare Directory:** A comprehensive, verified directory of healthcare providers (hospitals, clinics, pharmacies, individual practitioners). Users can search, filter, and book appointments.
*   **Health Tools:** Over 100 AI-powered and standard health tools, including symptom checkers, calculators (BMI, BMR, etc.), and health trackers.
*   **LMS (Courses):** An extensive library of health and wellness courses, some offering certification.
*   **Community Hub:**
    *   **Causes:** Crowdfunding for patients in need.
    *   **Forums:** Moderated discussion boards for various health topics.
    *   **Health News:** AI-powered, real-time news feed.
    *   **HealthTalk Podcast:** Expert interviews and discussions.
*   **E-commerce Shop:** A marketplace for healthcare products and medications.
*   **Personal Dashboards:** For both public users and healthcare providers to manage their activities on the platform.

**Your Core Responsibilities:**

1.  **Platform Navigation:** Guide users to the correct sections of the platform. Be specific (e.g., "You can find that in the 'Health Tools' section, under 'Calculators'.").
2.  **Feature Explanation:** Clearly explain how to use different features (e.g., "To book an appointment, go to the provider's profile and click the 'Book Now' button.").
3.  **Resource Recommendation:** Based on the user's query, suggest relevant providers, tools, courses, or community resources.
4.  **General Health Information:** Provide accurate, high-level health information. **Crucially, you must always include a disclaimer that you are not a medical professional and that the user should consult with a doctor for medical advice.**
5.  **Empathetic Support:** Interact with users in a caring and understanding manner, especially when they discuss sensitive health topics.

**Interaction Guidelines (Non-negotiable):**

*   **Medical Disclaimer:** Every response containing health information MUST end with a disclaimer, such as: "Please remember, I am an AI assistant and not a medical professional. This information is for educational purposes only. You should always consult with a qualified healthcare provider for any medical concerns or before making any decisions about your health."
*   **Emergency Protocol:** If a user mentions symptoms that could indicate an emergency (e.g., chest pain, difficulty breathing, severe bleeding, thoughts of self-harm), your **first and immediate** action is to advise them to contact emergency services (e.g., "If you are experiencing a medical emergency, please call 911 or your local emergency number immediately.").
*   **No Diagnoses:** You are strictly forbidden from providing diagnoses, interpreting test results, or recommending specific treatments or medications.
*   **Maintain a Professional Tone:** Be helpful, respectful, and clear in all your communications.

**Response Formatting:**

*   Use markdown for clarity (lists, bolding) where appropriate.
*   At the end of your main response, provide 2-3 relevant follow-up suggestions.

**Conversation Context:**

${contextMessages}

**User's Current Question:** ${message}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: systemPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH', 
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiResponse) {
        throw new Error('No response generated');
      }
      
      // Extract suggestions if provided
      let suggestions: string[] = [];
      const suggestionMatch = aiResponse.match(/SUGGESTIONS:\s*(.+?)(?=$|\n)/s);
      if (suggestionMatch && suggestionMatch[1]) {
        const suggestionText = suggestionMatch[1].trim();
        suggestions = suggestionText.split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        // Remove suggestions section from the final response
        aiResponse = aiResponse.replace(/SUGGESTIONS:\s*(.+?)(?=$|\n)/s, '').trim();
      }
      
      return {
        message: aiResponse,
        suggestions: suggestions
      };
      
    } catch (error) {
      console.error('Gemini AI call failed:', error);
      
      // Fallback to predefined responses
      const lowerMessage = message.toLowerCase();
      let fallbackResponse = "I'm experiencing some technical difficulties right now, but I'm here to help you with finding healthcare providers, using health tools, booking appointments, learning about courses, supporting community causes, and managing your account. For immediate assistance, please contact our support team.";
      let fallbackSuggestions = [
        "Contact support",
        "Try again later",
        "Explore the help center"
      ];
      
      if (lowerMessage.includes('find doctor') || lowerMessage.includes('healthcare provider')) {
        fallbackResponse = `I can help you find healthcare providers! Use our Healthcare Directory to search by location, specialty, services offered, insurance accepted, and patient ratings. You can access the directory from the main menu or search directly from the header.`;
        fallbackSuggestions = [
          "Find doctors near me",
          "Find specialists",
          "Find telehealth providers"
        ];
      } else if (lowerMessage.includes('health tool') || lowerMessage.includes('calculator')) {
        fallbackResponse = `CareConnect offers 100+ health tools including AI-powered tools like symptom checker, mental health support, nutrition planner, and emergency triage assistant, as well as calculators and trackers for BMI, blood pressure, medication, and more. All tools include medical disclaimers and are for informational purposes only.`;
        fallbackSuggestions = [
          "Use symptom checker",
          "Calculate my BMI",
          "Track my medications"
        ];
      }
      
      return {
        message: fallbackResponse,
        suggestions: fallbackSuggestions
      };
    }
  };

  const exportChat = () => {
    const currentSession = getCurrentSession();
    if (!currentSession) return;

    const chatData = {
      session: currentSession.name,
      date: currentSession.createdAt.toISOString(),
      messages: currentSession.messages.map(msg => ({
        sender: msg.isBot ? 'AI Assistant' : 'User',
        message: msg.content,
        timestamp: msg.timestamp.toISOString(),
        feedback: msg.feedback
      }))
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careconnect-chat-${currentSession.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteSession = (sessionId: string) => {
    if (sessions.length <= 1) {
      // Don't delete the last session, create a new one instead
      createNewSession();
    } else {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        // Set the first available session as current
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          setCurrentSessionId(remainingSessions[0].id);
        }
      }
    }
    setShowSessionMenu(false);
  };

  const giveFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setSessions(prev => prev.map(session => ({
      ...session,
      messages: session.messages.map(msg => 
        msg.id === messageId
          ? { ...msg, feedback }
          : msg
      )
    })));
  };

  const currentSession = getCurrentSession();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-primary/90 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        title="Chat with AI Support Agent"
        aria-label="Open AI Support Chat"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ${isMinimized ? 'w-80 h-16' : 'w-80 h-[32rem] sm:w-96'}`}
      aria-live="polite"
      role="region"
      aria-label="AI Support Chat"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-primary text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Support Agent</h3>
            <p className="text-xs opacity-90">Always here to help</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Session Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSessionMenu(!showSessionMenu)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Chat sessions"
              aria-label="Chat session menu"
              aria-expanded={showSessionMenu}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showSessionMenu && (
              <div 
                className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10"
                role="menu"
              >
                <button
                  onClick={() => {
                    createNewSession();
                    setShowSessionMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  role="menuitem"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </button>
                <button
                  onClick={exportChat}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  role="menuitem"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Chat
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                {sessions.slice(0, 5).map(session => (
                  <div key={session.id} className="flex justify-between items-center px-1">
                    <button
                      onClick={() => {
                        setCurrentSessionId(session.id);
                        setShowSessionMenu(false);
                      }}
                      className={`flex-1 text-left px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${session.id === currentSessionId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}
                      role="menuitem"
                    >
                      <div className="truncate max-w-[140px]">{session.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(session.lastActivity).toLocaleDateString()}
                      </div>
                    </button>
                    <button 
                      onClick={() => deleteSession(session.id)}
                      className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      aria-label={`Delete ${session.name} chat`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title={isMinimized ? "Expand chat" : "Minimize chat"}
            aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Close chat"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto h-[calc(32rem-8rem)] space-y-4" aria-label="Chat messages">
            {currentSession?.messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-2 ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                {message.isBot && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm group ${message.isBot ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'bg-primary text-white'}`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-1 ${message.isBot ? 'text-gray-500 dark:text-gray-400' : 'text-primary-100'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  
                  {/* Feedback buttons for bot messages */}
                  {message.isBot && (
                    <div className="hidden group-hover:flex mt-1 space-x-1 justify-end">
                      <button 
                        onClick={() => giveFeedback(message.id, 'positive')}
                        className={`p-1 rounded-full ${message.feedback === 'positive' ? 'bg-green-100 text-green-600 dark:bg-green-800/30 dark:text-green-400' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'}`}
                        aria-label="Helpful"
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => giveFeedback(message.id, 'negative')}
                        className={`p-1 rounded-full ${message.feedback === 'negative' ? 'bg-red-100 text-red-600 dark:bg-red-800/30 dark:text-red-400' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'}`}
                        aria-label="Not helpful"
                        title="Not helpful"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                
                {!message.isBot && (
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isThinking && (
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg max-w-xs">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            {isLoading && !isThinking && (
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex items-center justify-center p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
                <button 
                  onClick={() => setError(null)}
                  className="ml-auto text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Suggestions */}
            {suggestions.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(suggestion)}
                    className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-full flex items-center transition-colors"
                  >
                    <Sparkles className="w-3 h-3 mr-1 text-primary" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Medical Disclaimer */}
          <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-100 dark:border-yellow-800/30">
            <p className="text-xs text-yellow-800 dark:text-yellow-400 flex items-center">
              <Info className="w-3 h-3 mr-1 flex-shrink-0" />
              <span>For medical emergencies, please call emergency services immediately.</span>
            </p>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex space-x-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Ask me anything about CareConnect..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                disabled={isLoading}
                aria-label="Your message"
              />
              <button
                type="submit"
                disabled={!currentMessage.trim() || isLoading}
                className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AISupportAgent;