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
import { githubDB, collections } from '../../lib/database';

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
  userId: string;
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

  useEffect(() => {
    // Always load sessions (for both authenticated and anonymous users)
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    if (user) {
      try {
        const userSessions = await githubDB.find(collections.chat_sessions, { userId: user.id });
        const sortedSessions = userSessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
        setSessions(sortedSessions);
        if (sortedSessions.length > 0) {
          setCurrentSessionId(sortedSessions[0].id);
        } else {
          createNewSession();
        }
      } catch (error) {
        console.warn('Failed to load sessions from database:', error);
        createNewSession();
      }
    } else {
      // For anonymous users, start with a new session
      createNewSession();
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, isLoading]);

  useEffect(() => {
    // Initialize with empty suggestions - AI will provide contextual ones
    setSuggestions([]);
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewSession = async (): Promise<ChatSession> => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      userId: user?.id || 'anonymous',
      name: `Chat ${sessions.length + 1}`,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    // Only save to database if user is authenticated
    if (user) {
      try {
        await githubDB.insert(collections.chat_sessions, newSession);
      } catch (error) {
        console.warn('Failed to save session to database:', error);
      }
    }
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setSuggestions([]);
    return newSession;
  };

  const getCurrentSession = () => {
    return sessions.find(s => s.id === currentSessionId);
  };

  const sendMessage = async (message: string = currentMessage) => {
    if (!message.trim()) return;
    
    // Create a session if none exists (for non-authenticated users)
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      const newSession = await createNewSession();
      activeSessionId = newSession.id;
      setCurrentSessionId(activeSessionId);
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: message,
      isBot: false,
      timestamp: new Date(),
      sessionId: activeSessionId
    };

    // Optimistically update UI
    const updatedSessions = sessions.map(session =>
      session.id === activeSessionId 
        ? { 
            ...session, 
            messages: [...session.messages, userMessage],
            lastActivity: new Date()
          }
        : session
    );
    setSessions(updatedSessions);
    
    // Clear input and set loading states
    setCurrentMessage('');
    setError(null);
    setIsLoading(true);
    setIsThinking(true);
    setSuggestions([]);

    try {
      // Save user message to database (only for authenticated users)
      const currentSession = updatedSessions.find(s => s.id === activeSessionId);
      if (currentSession && user) {
        try {
          await githubDB.update(collections.chat_sessions, activeSessionId, { 
            messages: currentSession.messages, 
            lastActivity: currentSession.lastActivity 
          });
        } catch (error) {
          console.warn('Failed to save user message to database:', error);
        }
      }

      // Generate AI response
      setIsThinking(false);
      const response = await generateAIResponse(message, getCurrentSession());
      
      const botMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: response.message,
        isBot: true,
        timestamp: new Date(),
        sessionId: activeSessionId
      };

      // Update sessions with bot response
      const finalSessions = updatedSessions.map(session =>
        session.id === activeSessionId 
          ? { 
              ...session, 
              messages: [...session.messages, botMessage],
              lastActivity: new Date(),
              name: message.length > 20 ? `${message.substring(0, 20)}...` : message
            }
          : session
      );
      setSessions(finalSessions);
      
      // Save final session to database (only for authenticated users)
      const finalCurrentSession = finalSessions.find(s => s.id === activeSessionId);
      if (finalCurrentSession && user) {
        try {
          await githubDB.update(collections.chat_sessions, activeSessionId, { 
            messages: finalCurrentSession.messages, 
            lastActivity: finalCurrentSession.lastActivity, 
            name: finalCurrentSession.name 
          });
        } catch (error) {
          console.warn('Failed to save final session to database:', error);
        }
      }
      
      // Set suggestions if provided
      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }
    } catch (error) {
      console.error('AI response failed:', error);
      setError('I\'m having trouble connecting right now. Please try again in a moment.');
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment or contact our support team for immediate assistance.",
        isBot: true,
        timestamp: new Date(),
        sessionId: activeSessionId
      };

      const errorSessions = updatedSessions.map(session =>
        session.id === activeSessionId 
          ? { 
              ...session, 
              messages: [...session.messages, errorMessage],
              lastActivity: new Date()
            }
          : session
      );
      setSessions(errorSessions);
      
      // Save error session to database (only for authenticated users)
      const errorCurrentSession = errorSessions.find(s => s.id === activeSessionId);
      if (errorCurrentSession && user) {
        try {
          await githubDB.update(collections.chat_sessions, activeSessionId, { 
            messages: errorCurrentSession.messages, 
            lastActivity: errorCurrentSession.lastActivity 
          });
        } catch (error) {
          console.warn('Failed to save error session to database:', error);
        }
      }
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  const generateAIResponse = async (message: string, session: ChatSession | undefined): Promise<{message: string, suggestions?: string[]}> => {
    try {
      // Get API keys and validate
      const apiKeys = (import.meta.env.VITE_GEMINI_API_KEYS || '').split(',').filter(key => key.trim());
      if (apiKeys.length === 0) {
        throw new Error('No Gemini API keys configured');
      }
      
      const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)].trim();
      const lowerMessage = message.toLowerCase();
      
      // Build conversation context
      const contextMessages = session?.messages.slice(-8).map(msg =>
        `${msg.isBot ? 'Assistant' : 'User'}: ${msg.content}`
      ).join('\n') || '';

      // Fetch platform data for intelligent responses
      const [supportDocs, entities, healthTools, courses, blogPosts, causes, products] = await Promise.all([
        githubDB.get('ai_chatbot_support').catch(() => []),
        githubDB.get('entities').catch(() => []),
        githubDB.get('health_tools').catch(() => []),
        githubDB.get('courses').catch(() => []),
        githubDB.get('blog_posts').catch(() => []),
        githubDB.get('causes').catch(() => []),
        githubDB.get('products').catch(() => [])
      ]);

      // Build dynamic knowledge base
      const dynamicKnowledge = supportDocs.map((doc: any) => 
        `**${doc.topic}**:\n${doc.response}`
      ).join('\n\n');

      // Agentic search functionality
      let searchResults = '';
      const searchTerms = ['find', 'search', 'look for', 'locate', 'show me'];
      if (searchTerms.some(term => lowerMessage.includes(term))) {
        const searchQuery = message.replace(/find|search|look for|locate|show me/gi, '').trim();
        
        if (searchQuery.length > 2) {
          const entityResults = entities.filter((entity: any) =>
            entity.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entity.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entity.specialties?.some((spec: string) => spec.toLowerCase().includes(searchQuery.toLowerCase()))
          ).slice(0, 5);

          const toolResults = healthTools.filter((tool: any) =>
            tool.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.category?.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 3);

          const courseResults = courses.filter((course: any) =>
            course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description?.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 3);

          const blogResults = blogPosts.filter((post: any) =>
            post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.content?.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 3);

          const causeResults = causes.filter((cause: any) =>
            cause.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cause.description?.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 3);

          const productResults = products.filter((product: any) =>
            product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 3);

          if (entityResults.length > 0 || toolResults.length > 0 || courseResults.length > 0 || blogResults.length > 0 || causeResults.length > 0 || productResults.length > 0) {
            searchResults = `\n\n**SEARCH RESULTS FOR "${searchQuery}":**\n`;
            
            if (entityResults.length > 0) {
              searchResults += `\n**Healthcare Providers:**\n`;
              entityResults.forEach((entity: any) => {
                searchResults += `• ${entity.name} (${entity.entity_type}) - View at: /directory/${entity.id}\n`;
              });
            }
            
            if (toolResults.length > 0) {
              searchResults += `\n**Health Tools:**\n`;
              toolResults.forEach((tool: any) => {
                searchResults += `• ${tool.name} - ${tool.category} - Access at: /health-tools/${tool.id}\n`;
              });
            }
            
            if (courseResults.length > 0) {
              searchResults += `\n**Educational Courses:**\n`;
              courseResults.forEach((course: any) => {
                searchResults += `• ${course.title} - Learn at: /courses/${course.id}\n`;
              });
            }

            if (blogResults.length > 0) {
              searchResults += `\n**Health Articles:**\n`;
              blogResults.forEach((post: any) => {
                searchResults += `• ${post.title} - Read at: /blog/${post.id}\n`;
              });
            }

            if (causeResults.length > 0) {
              searchResults += `\n**Healthcare Causes:**\n`;
              causeResults.forEach((cause: any) => {
                searchResults += `• ${cause.title} - Support at: /causes/${cause.id}\n`;
              });
            }

            if (productResults.length > 0) {
              searchResults += `\n**Health Products:**\n`;
              productResults.forEach((product: any) => {
                searchResults += `• ${product.name} - Shop at: /shop/${product.id}\n`;
              });
            }
          }
        }
      }

      // Enhanced system prompt for fully agentic behavior
      const systemPrompt = `You are CareConnect AI, an advanced healthcare platform assistant. You provide intelligent, contextual, and secure assistance while maintaining strict privacy standards.

**CRITICAL EMERGENCY PROTOCOL:**
If the user mentions ANY emergency symptoms (chest pain, difficulty breathing, heart attack, stroke, bleeding, unconscious, overdose, suicide, severe injury, etc.), your IMMEDIATE response must be:
"🚨 MEDICAL EMERGENCY DETECTED 🚨
If you are experiencing a medical emergency, please:
• Call your local emergency number immediately (911 in US, 999 in UK, 112 in EU)
• Go to the nearest emergency room
• Contact emergency services immediately
Do not rely on this chat for emergency medical assistance."

**CORE PRINCIPLES:**
1. **Privacy First**: Never request, store, or reference PII/PHI. Redirect sensitive data sharing to secure platform areas.
2. **Intelligent Assistance**: Provide contextual, helpful responses based on platform data and user intent.
3. **Agentic Behavior**: Proactively suggest relevant actions, tools, and resources with specific platform links.
4. **Medical Safety**: Include medical disclaimers for health advice. Detect and respond to emergencies immediately.
5. **Platform Integration**: Guide users to appropriate platform features with exact URLs and navigation paths.

**COMPREHENSIVE PLATFORM DATA:**
- Healthcare Providers: ${entities.length} verified entities (hospitals, clinics, doctors, pharmacies)
- Health Tools: ${healthTools.length} interactive tools (symptom checkers, calculators, assessments)
- Educational Courses: ${courses.length} professional and patient education courses
- Health Articles: ${blogPosts.length} informative blog posts and health content
- Healthcare Causes: ${causes.length} crowdfunding campaigns for medical needs
- Health Products: ${products.length} medical supplies and wellness products
- Support Documentation: ${supportDocs.length} comprehensive help topics

**PLATFORM NAVIGATION URLS:**
- Directory: /directory (find healthcare providers)
- Health Tools: /health-tools (access medical calculators and assessments)
- Learning: /courses (educational content and certifications)
- Community: /community (forums and discussions)
- Shop: /shop (medical products and supplies)
- Causes: /causes (healthcare crowdfunding)
- Blog: /blog (health articles and news)
- Patient Portal: /patient (personal health records - requires login)
- Help Center: /help (comprehensive support)
- Contact: /contact (get human support)

**DYNAMIC KNOWLEDGE BASE:**
${dynamicKnowledge}

**SEARCH RESULTS:**${searchResults}

**CONVERSATION CONTEXT:**
${contextMessages}

**INTELLIGENT RESPONSE GUIDELINES:**
- Be conversational, empathetic, and highly knowledgeable about the platform
- Provide specific, actionable guidance with exact platform links and navigation
- Always suggest 2-3 relevant follow-up actions with specific URLs when applicable
- Include medical disclaimers for health-related content
- Use actual platform data to give personalized recommendations
- Format responses clearly with bullet points, sections, and clickable paths
- Proactively suggest relevant platform features based on user intent
- Help users navigate efficiently by providing direct links and step-by-step guidance
- Reference actual available content, providers, tools, and resources
- Be an expert guide who knows every aspect of the CareConnect platform

**AGENTIC CAPABILITIES:**
- Search across all platform content and provide specific results with links
- Recommend relevant healthcare providers based on user needs
- Suggest appropriate health tools for user symptoms or conditions
- Guide users to educational content that matches their interests
- Help with platform navigation and feature discovery
- Provide contextual help based on user's current needs and platform data

**USER QUERY:** ${message}

Respond as an intelligent, knowledgeable platform expert. Provide specific, actionable guidance with platform links and navigation. Always end with 2-3 specific suggestions formatted as: SUGGESTIONS: suggestion1; suggestion2; suggestion3`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1500
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
          ]
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiResponse) {
        throw new Error('No response generated from AI');
      }

      // Extract suggestions from AI response
      let suggestions: string[] = [];
      const suggestionMatch = aiResponse.match(/SUGGESTIONS:\s*(.+?)(?=\n|$)/s);
      if (suggestionMatch && suggestionMatch[1]) {
        suggestions = suggestionMatch[1]
          .split(';')
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 3);
        aiResponse = aiResponse.replace(/SUGGESTIONS:\s*(.+?)(?=\n|$)/s, '').trim();
      }

      // Generate dynamic fallback suggestions based on available platform data
      if (suggestions.length === 0) {
        const dynamicSuggestions = [];
        
        if (entities.length > 0) {
          dynamicSuggestions.push("Find healthcare providers");
        }
        if (healthTools.length > 0) {
          dynamicSuggestions.push("Explore health tools");
        }
        if (courses.length > 0) {
          dynamicSuggestions.push("Browse educational courses");
        }
        if (blogPosts.length > 0) {
          dynamicSuggestions.push("Read health articles");
        }
        if (causes.length > 0) {
          dynamicSuggestions.push("Support healthcare causes");
        }
        if (products.length > 0) {
          dynamicSuggestions.push("Shop health products");
        }
        
        // If no platform data, provide general assistance
        if (dynamicSuggestions.length === 0) {
          dynamicSuggestions.push("Get platform help", "Contact support", "Learn more");
        }
        
        suggestions = dynamicSuggestions.slice(0, 3);
      }
      
      return { message: aiResponse, suggestions };
      
    } catch (error) {
      console.error('AI response generation failed:', error);
      
      // Get platform data for intelligent fallback (declare variables in catch scope)
      let entities: any[] = [];
      let healthTools: any[] = [];
      let courses: any[] = [];
      let blogPosts: any[] = [];
      let causes: any[] = [];
      let products: any[] = [];
      
      try {
        [entities, healthTools, courses, blogPosts, causes, products] = await Promise.all([
          githubDB.get('entities').catch(() => []),
          githubDB.get('health_tools').catch(() => []),
          githubDB.get('courses').catch(() => []),
          githubDB.get('blog_posts').catch(() => []),
          githubDB.get('causes').catch(() => []),
          githubDB.get('products').catch(() => [])
        ]);
      } catch (dbError) {
        console.warn('Failed to fetch platform data for fallback:', dbError);
      }
      
      // Intelligent fallback based on message content and available platform data
      const lowerMessage = message.toLowerCase();
      let fallbackMessage = "I'm having trouble connecting to my AI service right now. ";
      let fallbackSuggestions = [];

      // Analyze user intent and provide relevant fallback with platform links
      if (lowerMessage.includes('provider') || lowerMessage.includes('doctor') || lowerMessage.includes('hospital')) {
        if (entities.length > 0) {
          fallbackMessage += `You can browse our ${entities.length} healthcare providers at /directory`;
          fallbackSuggestions = ["Browse Directory (/directory)", "Search Providers", "Contact Support (/contact)"];
        } else {
          fallbackMessage += "You can explore our healthcare directory at /directory when it's available.";
          fallbackSuggestions = ["Visit Directory (/directory)", "Contact Support (/contact)", "Try again"];
        }
      } else if (lowerMessage.includes('symptom') || lowerMessage.includes('health') || lowerMessage.includes('tool')) {
        if (healthTools.length > 0) {
          fallbackMessage += `You can access our ${healthTools.length} health tools at /health-tools`;
          fallbackSuggestions = ["View Health Tools (/health-tools)", "Symptom Checker", "Contact Support (/contact)"];
        } else {
          fallbackMessage += "You can explore our health tools at /health-tools when they're available.";
          fallbackSuggestions = ["Visit Health Tools (/health-tools)", "Contact Support (/contact)", "Try again"];
        }
      } else if (lowerMessage.includes('course') || lowerMessage.includes('learn') || lowerMessage.includes('education')) {
        if (courses.length > 0) {
          fallbackMessage += `You can explore our ${courses.length} educational courses at /courses`;
          fallbackSuggestions = ["Browse Courses (/courses)", "Learning Center", "Contact Support (/contact)"];
        } else {
          fallbackMessage += "You can explore our educational content at /courses when it's available.";
          fallbackSuggestions = ["Visit Courses (/courses)", "Contact Support (/contact)", "Try again"];
        }
      } else if (lowerMessage.includes('article') || lowerMessage.includes('blog') || lowerMessage.includes('read')) {
        if (blogPosts.length > 0) {
          fallbackMessage += `You can read our ${blogPosts.length} health articles at /blog`;
          fallbackSuggestions = ["Read Articles (/blog)", "Health News", "Contact Support (/contact)"];
        } else {
          fallbackMessage += "You can explore our health articles at /blog when they're available.";
          fallbackSuggestions = ["Visit Blog (/blog)", "Contact Support (/contact)", "Try again"];
        }
      } else if (lowerMessage.includes('shop') || lowerMessage.includes('product') || lowerMessage.includes('buy')) {
        if (products.length > 0) {
          fallbackMessage += `You can shop our ${products.length} health products at /shop`;
          fallbackSuggestions = ["Shop Products (/shop)", "Browse Catalog", "Contact Support (/contact)"];
        } else {
          fallbackMessage += "You can explore our health products at /shop when they're available.";
          fallbackSuggestions = ["Visit Shop (/shop)", "Contact Support (/contact)", "Try again"];
        }
      } else if (lowerMessage.includes('cause') || lowerMessage.includes('donate') || lowerMessage.includes('support')) {
        if (causes.length > 0) {
          fallbackMessage += `You can support our ${causes.length} healthcare causes at /causes`;
          fallbackSuggestions = ["View Causes (/causes)", "Make Donation", "Contact Support (/contact)"];
        } else {
          fallbackMessage += "You can explore healthcare causes at /causes when they're available.";
          fallbackSuggestions = ["Visit Causes (/causes)", "Contact Support (/contact)", "Try again"];
        }
      } else {
        // General fallback with comprehensive platform overview
        const availableFeatures = [];
        if (entities.length > 0) availableFeatures.push(`${entities.length} healthcare providers`);
        if (healthTools.length > 0) availableFeatures.push(`${healthTools.length} health tools`);
        if (courses.length > 0) availableFeatures.push(`${courses.length} courses`);
        if (blogPosts.length > 0) availableFeatures.push(`${blogPosts.length} articles`);
        if (causes.length > 0) availableFeatures.push(`${causes.length} causes`);
        if (products.length > 0) availableFeatures.push(`${products.length} products`);
        
        if (availableFeatures.length > 0) {
          fallbackMessage += `Meanwhile, explore our platform with ${availableFeatures.join(', ')}.`;
          fallbackSuggestions = ["Browse Directory (/directory)", "Health Tools (/health-tools)", "Contact Support (/contact)"];
        } else {
          fallbackMessage += "Please try again in a moment or visit /help for assistance.";
          fallbackSuggestions = ["Try again", "Get Help (/help)", "Contact Support (/contact)"];
        }
      }

      return {
        message: fallbackMessage,
        suggestions: fallbackSuggestions.slice(0, 3)
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

  const deleteSession = async (sessionId: string) => {
    await githubDB.delete(collections.chat_sessions, sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        setCurrentSessionId(remainingSessions[0].id);
      } else {
        createNewSession();
      }
    }
    setShowSessionMenu(false);
  };

  const giveFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    const updatedSessions = sessions.map(session => ({
      ...session,
      messages: session.messages.map(msg => 
        msg.id === messageId
          ? { ...msg, feedback }
          : msg
      )
    }));
    setSessions(updatedSessions);
    const currentSession = updatedSessions.find(s => s.id === currentSessionId);
    if (currentSession) {
      await githubDB.update(collections.chat_sessions, currentSessionId, { messages: currentSession.messages });
    }
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
      className={`fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col ${isMinimized ? 'w-80 h-16' : 'w-80 sm:w-96 h-[80vh] max-h-[700px]'}`}
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
          <div className="flex-1 p-4 overflow-y-auto space-y-4" aria-label="Chat messages">
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
                if (currentMessage.trim() && !isLoading) {
                  sendMessage();
                }
              }}
              className="flex space-x-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (currentMessage.trim() && !isLoading) {
                      sendMessage();
                    }
                  }
                }}
                placeholder="Ask me anything about CareConnect..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                disabled={isLoading}
                aria-label="Your message"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!currentMessage.trim() || isLoading}
                className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentMessage.trim() && !isLoading) {
                    sendMessage();
                  }
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AISupportAgent;