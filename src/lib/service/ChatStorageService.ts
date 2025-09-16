import connectDB from '@/lib/mongodb';

export interface ChatMessage {
  id: string;
  userId: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  language: string;
  isVoice?: boolean;
  audioUrl?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export class ChatStorageService {
  private static instance: ChatStorageService;

  private constructor() {}

  public static getInstance(): ChatStorageService {
    if (!ChatStorageService.instance) {
      ChatStorageService.instance = new ChatStorageService();
    }
    return ChatStorageService.instance;
  }

  public async saveMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    try {
      const mongoose = await connectDB();
      const db = mongoose.connection.db;
      
      const chatMessage: ChatMessage = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };

      await db?.collection('chat_messages').insertOne(chatMessage);
      return chatMessage;
    } catch (error) {
      console.error('Error saving chat message:', error);
      throw new Error('Failed to save chat message');
    }
  }

  public async getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const mongoose = await connectDB();
      const db = mongoose.connection.db;
      
      const messages = await db?.collection('chat_messages')
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      // Map MongoDB documents to ChatMessage type
      const chatMessages: ChatMessage[] = (messages ?? []).map((msg: any) => ({
        id: msg.id,
        userId: msg.userId,
        type: msg.type,
        text: msg.text,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
        language: msg.language,
        isVoice: msg.isVoice,
        audioUrl: msg.audioUrl
      }));

      return chatMessages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }

  public async createChatSession(userId: string, title: string): Promise<ChatSession> {
    try {
      const mongoose = await connectDB();
      const db = mongoose.connection.db;
      
      const session: ChatSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        title,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      await db?.collection('chat_sessions').insertOne(session);
      return session;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw new Error('Failed to create chat session');
    }
  }

  public async getActiveChatSession(userId: string): Promise<ChatSession | null> {
    try {
      const mongoose = await connectDB();
      const db = mongoose.connection.db;

      const sessionDoc = await db?.collection('chat_sessions')
        .findOne({ userId, isActive: true });

      if (!sessionDoc) {
        return null;
      }

      const session: ChatSession = {
        id: sessionDoc.id,
        userId: sessionDoc.userId,
        title: sessionDoc.title,
        messages: sessionDoc.messages ?? [],
        createdAt: sessionDoc.createdAt instanceof Date ? sessionDoc.createdAt : new Date(sessionDoc.createdAt),
        updatedAt: sessionDoc.updatedAt instanceof Date ? sessionDoc.updatedAt : new Date(sessionDoc.updatedAt),
        isActive: sessionDoc.isActive
      };

      return session;
    } catch (error) {
      console.error('Error fetching active chat session:', error);
      return null;
    }
  }

  public async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
    try {
      const mongoose = await connectDB();
      const db = mongoose.connection.db;
      
      await db?.collection('chat_sessions').updateOne(
        { id: sessionId },
        { 
          $set: { 
            ...updates, 
            updatedAt: new Date() 
          } 
        }
      );
    } catch (error) {
      console.error('Error updating chat session:', error);
      throw new Error('Failed to update chat session');
    }
  }

  public async addMessageToSession(sessionId: string, message: ChatMessage): Promise<void> {
    try {
      const mongoose = await connectDB();
      const db = mongoose.connection.db;
      
      if (!db) throw new Error('Database connection failed');
      await db.collection('chat_sessions').updateOne(
        { id: sessionId },
        ({
          $push: { messages: { $each: [message] } },
          $set: { updatedAt: new Date() }
        } as any)
      );
    } catch (error) {
      console.error('Error adding message to session:', error);
      throw new Error('Failed to add message to session');
    }
  }

  public async getChatSessions(userId: string): Promise<ChatSession[]> {
    try {
      const mongoose = await connectDB();
      const db = mongoose.connection.db;
      
      if (!db) throw new Error('Database connection failed');
      const sessions = await db.collection('chat_sessions')
        .find({ userId })
        .sort({ updatedAt: -1 })
        .toArray();

      // Map MongoDB documents to ChatSession type
      const chatSessions: ChatSession[] = (sessions ?? []).map((sessionDoc: any) => ({
        id: sessionDoc.id,
        userId: sessionDoc.userId,
        title: sessionDoc.title,
        messages: sessionDoc.messages ?? [],
        createdAt: sessionDoc.createdAt instanceof Date ? sessionDoc.createdAt : new Date(sessionDoc.createdAt),
        updatedAt: sessionDoc.updatedAt instanceof Date ? sessionDoc.updatedAt : new Date(sessionDoc.updatedAt),
        isActive: sessionDoc.isActive
      }));

      return chatSessions;
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }
  }

  public async deleteChatSession(sessionId: string): Promise<void> {
    try {
      const mongoose = await connectDB();
      const db = mongoose.connection.db;
      
  if (!db) throw new Error('Database connection failed');
  await db.collection('chat_sessions').deleteOne({ id: sessionId });
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw new Error('Failed to delete chat session');
    }
  }
}
