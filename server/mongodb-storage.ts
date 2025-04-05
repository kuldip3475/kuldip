import { IStorage } from './storage';
import { getDb } from './mongodb';
import { InsertUser, User, InsertContact, Contact, InsertMessage, Message, MongoUser as SchemaMongoUser, MongoContact as SchemaMongoContact, MongoMessage as SchemaMongoMessage } from '@shared/schema';
import { Collection, ObjectId } from 'mongodb';
import { log } from './vite';
import session from 'express-session';
import connectMongo from 'connect-mongo';

// Create MongoDB session store
const MongoStore = connectMongo;

interface MongoDBUser extends Omit<User, 'id'> {
  _id: ObjectId;
}

interface MongoDBContact extends Omit<Contact, 'id'> {
  _id: ObjectId;
}

interface MongoDBMessage extends Omit<Message, 'id'> {
  _id: ObjectId;
}

export class MongoDBStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Initialize session store
    this.sessionStore = new MongoStore({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: process.env.MONGODB_DB_NAME || 'messenger_app',
      collectionName: 'sessions',
      ttl: 60 * 60 * 24, // 1 day
    });
  }

  /**
   * Initialize MongoDB collections with indexes
   */
  async initialize(): Promise<void> {
    try {
      const db = await getDb();
      
      // Create indexes
      await db.collection('users').createIndex({ username: 1 }, { unique: true });
      await db.collection('contacts').createIndex({ userId: 1, contactId: 1 }, { unique: true });
      await db.collection('messages').createIndex({ senderId: 1, receiverId: 1 });
      
      log('MongoDB collections initialized with indexes', 'mongodb');
    } catch (error) {
      log(`Failed to initialize MongoDB collections: ${error}`, 'mongodb');
      throw error;
    }
  }

  // User Operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const db = await getDb();
      const user = await db.collection<MongoDBUser>('users').findOne({ _id: new ObjectId(id.toString()) });
      
      if (!user) return undefined;
      
      return this.mapMongoUserToUser(user as any);
    } catch (error) {
      log(`Error getting user: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const db = await getDb();
      const user = await db.collection<MongoDBUser>('users').findOne({ username });
      
      if (!user) return undefined;
      
      return this.mapMongoUserToUser(user as any);
    } catch (error) {
      log(`Error getting user by username: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const db = await getDb();
      const collection = db.collection<MongoDBUser>('users');
      
      const result = await collection.insertOne({
        ...insertUser,
        _id: new ObjectId(),
        isOnline: true,
        lastSeen: new Date(),
      } as MongoDBUser);
      
      const user = await collection.findOne({ _id: result.insertedId });
      
      if (!user) {
        throw new Error('User not found after creation');
      }
      
      return this.mapMongoUserToUser(user as any);
    } catch (error) {
      log(`Error creating user: ${error}`, 'mongodb');
      throw error;
    }
  }

  async updateUserStatus(id: number, isOnline: boolean): Promise<User | undefined> {
    try {
      const db = await getDb();
      const objectId = new ObjectId(id.toString());
      
      const result = await db.collection<MongoDBUser>('users').findOneAndUpdate(
        { _id: objectId },
        { $set: { isOnline, lastSeen: new Date() } },
        { returnDocument: 'after' }
      );
      
      if (!result) return undefined;
      
      return this.mapMongoUserToUser(result as any);
    } catch (error) {
      log(`Error updating user status: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async updateUserLastSeen(id: number): Promise<User | undefined> {
    try {
      const db = await getDb();
      const objectId = new ObjectId(id.toString());
      
      const result = await db.collection<MongoDBUser>('users').findOneAndUpdate(
        { _id: objectId },
        { $set: { lastSeen: new Date() } },
        { returnDocument: 'after' }
      );
      
      if (!result) return undefined;
      
      return this.mapMongoUserToUser(result as any);
    } catch (error) {
      log(`Error updating user last seen: ${error}`, 'mongodb');
      return undefined;
    }
  }

  // Contact Operations
  async getContacts(userId: number): Promise<User[]> {
    try {
      const db = await getDb();
      const contacts = await db.collection<MongoDBContact>('contacts')
        .find({ userId: userId })
        .toArray();
      
      if (contacts.length === 0) return [];
      
      // Get all contact users
      const contactIds = contacts.map(contact => contact.contactId);
      const contactUsers = await db.collection<MongoDBUser>('users')
        .find({ _id: { $in: contactIds.map(id => new ObjectId(id.toString())) } })
        .toArray();
      
      return contactUsers.map(user => this.mapMongoUserToUser(user as any));
    } catch (error) {
      log(`Error getting contacts: ${error}`, 'mongodb');
      return [];
    }
  }

  async addContact(insertContact: InsertContact): Promise<Contact> {
    try {
      const db = await getDb();
      const collection = db.collection<MongoDBContact>('contacts');
      
      // Check if contact already exists
      const existingContact = await collection.findOne({
        userId: insertContact.userId,
        contactId: insertContact.contactId
      });
      
      if (existingContact) {
        return this.mapMongoContactToContact(existingContact as any);
      }
      
      const result = await collection.insertOne({
        ...insertContact,
        _id: new ObjectId()
      } as MongoDBContact);
      
      const contact = await collection.findOne({ _id: result.insertedId });
      
      if (!contact) {
        throw new Error('Contact not found after creation');
      }
      
      return this.mapMongoContactToContact(contact as any);
    } catch (error) {
      log(`Error adding contact: ${error}`, 'mongodb');
      throw error;
    }
  }

  async removeContact(userId: number, contactId: number): Promise<boolean> {
    try {
      const db = await getDb();
      
      const result = await db.collection<MongoDBContact>('contacts').deleteOne({
        userId,
        contactId
      });
      
      return result.deletedCount > 0;
    } catch (error) {
      log(`Error removing contact: ${error}`, 'mongodb');
      return false;
    }
  }

  // Message Operations
  async getMessages(userId: number, contactId: number): Promise<Message[]> {
    try {
      const db = await getDb();
      
      const messages = await db.collection<MongoDBMessage>('messages')
        .find({
          $or: [
            { senderId: userId, receiverId: contactId },
            { senderId: contactId, receiverId: userId }
          ]
        })
        .sort({ sentAt: 1 })
        .toArray();
      
      return messages.map(message => this.mapMongoMessageToMessage(message as any));
    } catch (error) {
      log(`Error getting messages: ${error}`, 'mongodb');
      return [];
    }
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      const db = await getDb();
      const collection = db.collection<MongoDBMessage>('messages');
      
      const messageToInsert = {
        ...insertMessage,
        _id: new ObjectId(),
        sentAt: new Date(),
        isRead: false
      } as MongoDBMessage;
      
      const result = await collection.insertOne(messageToInsert);
      
      const message = await collection.findOne({ _id: result.insertedId });
      
      if (!message) {
        throw new Error('Message not found after creation');
      }
      
      return this.mapMongoMessageToMessage(message as any);
    } catch (error) {
      log(`Error creating message: ${error}`, 'mongodb');
      throw error;
    }
  }

  async markMessageAsRead(messageId: number): Promise<Message | undefined> {
    try {
      const db = await getDb();
      const objectId = new ObjectId(messageId.toString());
      
      const result = await db.collection<MongoDBMessage>('messages').findOneAndUpdate(
        { _id: objectId },
        { $set: { isRead: true } },
        { returnDocument: 'after' }
      );
      
      if (!result) return undefined;
      
      return this.mapMongoMessageToMessage(result as any);
    } catch (error) {
      log(`Error marking message as read: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async getRecentConversations(userId: number): Promise<{contact: User, lastMessage: Message}[]> {
    try {
      const db = await getDb();
      const messagesCollection = db.collection<MongoDBMessage>('messages');
      const usersCollection = db.collection<MongoDBUser>('users');
      
      // Get all contacts for the user
      const contacts = await this.getContacts(userId);
      
      if (contacts.length === 0) return [];
      
      const conversations: {contact: User, lastMessage: Message}[] = [];
      
      // For each contact, get the latest message
      for (const contact of contacts) {
        const lastMessage = await messagesCollection
          .find({
            $or: [
              { senderId: userId, receiverId: contact.id },
              { senderId: contact.id, receiverId: userId }
            ]
          })
          .sort({ sentAt: -1 })
          .limit(1)
          .toArray();
          
        if (lastMessage.length > 0) {
          conversations.push({
            contact,
            lastMessage: this.mapMongoMessageToMessage(lastMessage[0] as any)
          });
        }
      }
      
      // Sort conversations by last message time (descending)
      return conversations.sort((a, b) => 
        new Date(b.lastMessage.sentAt).getTime() - new Date(a.lastMessage.sentAt).getTime()
      );
    } catch (error) {
      log(`Error getting recent conversations: ${error}`, 'mongodb');
      return [];
    }
  }

  // Helper methods to map between MongoDB and application models
  private mapMongoUserToUser(mongoUser: MongoDBUser): User {
    return {
      id: parseInt(mongoUser._id.toString()),
      username: mongoUser.username,
      displayName: mongoUser.displayName,
      password: mongoUser.password,
      isOnline: mongoUser.isOnline,
      lastSeen: mongoUser.lastSeen,
      avatar: mongoUser.avatar
    };
  }
  
  private mapMongoContactToContact(mongoContact: MongoDBContact): Contact {
    return {
      id: parseInt(mongoContact._id.toString()),
      userId: mongoContact.userId,
      contactId: mongoContact.contactId
    };
  }
  
  private mapMongoMessageToMessage(mongoMessage: MongoDBMessage): Message {
    return {
      id: parseInt(mongoMessage._id.toString()),
      senderId: mongoMessage.senderId,
      receiverId: mongoMessage.receiverId,
      content: mongoMessage.content,
      sentAt: mongoMessage.sentAt,
      isRead: mongoMessage.isRead
    };
  }
}