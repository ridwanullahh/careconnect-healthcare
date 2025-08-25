// Bismillah Ar-Rahman Ar-Roheem
// AI Chatbot Support Service

import { githubDB, collections } from '../database';
import { geminiAI } from './gemini-service';
import { HealthTool, ToolChatSession, ChatMessage, ToolType } from '../health-tools-master';

export class AIChatbotSupportService {
  private static instance: AIChatbotSupportService;

  static getInstance(): AIChatbotSupportService {
    if (!AIChatbotSupportService.instance) {
      AIChatbotSupportService.instance = new AIChatbotSupportService();
    }
    return AIChatbotSupportService.instance;
  }

  async startSession(toolId: string, userId?: string, initialInputs?: Record<string, any>): Promise<ToolChatSession> {
    const tool = await this.getTool(toolId);
    const sessionId = `chat-${tool.id}-${Date.now()}`;

    const session: ToolChatSession = {
      id: sessionId,
      toolId: tool.id,
      userId,
      name: `${tool.name} Session - ${new Date().toLocaleString()}`,
      messages: [],
      context: {
        initialInputs,
      },
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    };

    await githubDB.insert(collections.chat_sessions, session);
    return session;
  }

  async triggerInitialResponse(sessionId: string): Promise<ToolChatSession> {
    const session = await this.getSession(sessionId);
    const tool = await this.getTool(session.toolId);

    if (session.messages.length > 0) {
      return session; // Already initialized
    }
    
    if (tool.type === ToolType.AI_POWERED && session.context.initialInputs) {
      const initialUserMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        content: `I have filled out the form for the ${tool.name}. Here are my details. Please provide your analysis.`,
        isBot: false,
        timestamp: new Date(),
        sessionId,
        toolId: tool.id,
      };
      session.messages.push(initialUserMessage);
      
      const firstAIResponse = await this.generateAIResponse(tool, session);
      session.messages.push(firstAIResponse);
    } else if (tool.ai_chat_config?.conversation_starters?.length) {
      const welcomeMessage: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        content: tool.ai_chat_config.conversation_starters[0],
        isBot: true,
        timestamp: new Date(),
        sessionId,
        toolId: tool.id,
      };
      session.messages.push(welcomeMessage);
    }

    await githubDB.update(collections.chat_sessions, sessionId, { messages: session.messages, lastActivity: new Date() });
    return session;
  }

  async sendMessage(sessionId: string, content: string): Promise<ChatMessage> {
    const session = await this.getSession(sessionId);
    const tool = await this.getTool(session.toolId);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      content,
      isBot: false,
      timestamp: new Date(),
      sessionId,
      toolId: tool.id,
    };
    session.messages.push(userMessage);

    const aiResponse = await this.generateAIResponse(tool, session);
    session.messages.push(aiResponse);

    await githubDB.update(collections.chat_sessions, sessionId, {
      messages: session.messages,
      lastActivity: new Date(),
    });

    return aiResponse;
  }

  private async generateAIResponse(tool: HealthTool, session: ToolChatSession): Promise<ChatMessage> {
    let prompt = '';
    const conversationHistory = session.messages
      .map((msg) => `${msg.isBot ? 'AI' : 'User'}: ${msg.content}`)
      .join('\n');

    // For the first AI turn in an AI_POWERED tool, use the specific prompt template
    if (tool.type === ToolType.AI_POWERED && session.messages.length <= 2) {
      const template = tool.ai_config?.prompt_template || `Analyze the following for ${tool.name}: {{inputs}}`;
      const inputs = session.context.initialInputs || {};
      
      prompt = template;
      Object.keys(inputs).forEach(key => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        prompt = prompt.replace(placeholder, inputs[key]);
      });
      prompt = `Based on the following information, please provide a detailed analysis and guidance.\n\n${prompt}`;

    } else {
      // For standard chat turns
      const systemPrompt = tool.ai_chat_config?.system_prompt || tool.ai_config?.prompt_template || `You are a helpful AI assistant for ${tool.name}.`;
      prompt = `${systemPrompt}\n\nConversation History:\n${conversationHistory}\n\nAI:`;
    }

    const responseContent = await geminiAI.generateContent(prompt);

    return {
      id: `msg-${Date.now()}-bot`,
      content: responseContent,
      isBot: true,
      timestamp: new Date(),
      sessionId: session.id,
      toolId: tool.id,
      metadata: {
        medicalDisclaimer: true // Always add disclaimer for safety
      }
    };
  }

  private async getTool(toolId: string): Promise<HealthTool> {
    const tool = await githubDB.findById<HealthTool>(collections.health_tools, toolId);
    if (!tool || (tool.type !== ToolType.AI_CHAT && tool.type !== ToolType.AI_POWERED)) {
      throw new Error('Invalid AI tool for chat.');
    }
    return tool;
  }

  private async getSession(sessionId: string): Promise<ToolChatSession> {
    const session = await githubDB.findById<ToolChatSession>(collections.chat_sessions, sessionId);
    if (!session) {
      throw new Error('Chat session not found');
    }
    return session;
  }
}

export const aiChatbotSupportService = AIChatbotSupportService.getInstance();