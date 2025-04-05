import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import { log } from './vite';

// Connection URI (replace with your actual connection string)
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// Create a MongoClient with specific options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let dbInstance: Db | null = null;
const DB_NAME = process.env.MONGODB_DB_NAME || 'messenger_app';

/**
 * Connect to MongoDB and return the database instance
 */
export async function connectToMongoDB(): Promise<Db> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    log('Connecting to MongoDB...', 'mongodb');
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    log('Successfully connected to MongoDB!', 'mongodb');
    
    dbInstance = client.db(DB_NAME);
    return dbInstance;
  } catch (error) {
    log(`Failed to connect to MongoDB: ${error}`, 'mongodb');
    throw error;
  }
}

/**
 * Get the MongoDB database instance, connecting if needed
 */
export async function getDb(): Promise<Db> {
  if (!dbInstance) {
    return connectToMongoDB();
  }
  return dbInstance;
}

/**
 * Close the MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    dbInstance = null;
    log('MongoDB connection closed', 'mongodb');
  }
}

// Handle application shutdown gracefully
process.on('SIGINT', async () => {
  await closeMongoDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeMongoDB();
  process.exit(0);
});