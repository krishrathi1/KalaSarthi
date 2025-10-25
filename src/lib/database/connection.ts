// Database connection utility for trending services
import connectDB from '@/lib/mongodb';

/**
 * Connect to the database
 * This is a wrapper around the existing MongoDB connection
 */
export async function connectToDatabase(): Promise<void> {
  try {
    await connectDB();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

export default connectToDatabase;
