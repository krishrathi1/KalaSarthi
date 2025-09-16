import mongoose from "mongoose";

declare global {
  // Prevents multiple instances in dev
  var mongooseGlobal: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI && process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  console.warn("MONGODB_URI not defined - this may cause issues if database connection is needed");
}


if (!global.mongooseGlobal) {
  global.mongooseGlobal = { conn: null, promise: null };
}

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable");
  }

  if (global.mongooseGlobal.conn && mongoose.connection.readyState === 1) {
    return global.mongooseGlobal.conn;
  }

  if (!global.mongooseGlobal.promise) {
    global.mongooseGlobal.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // fail fast in Cloud Run
    }).then((mongoose) => mongoose);
  }

  try {
    global.mongooseGlobal.conn = await global.mongooseGlobal.promise;
  } catch (e) {
    global.mongooseGlobal.promise = null;
    throw e;
  }

  return global.mongooseGlobal.conn;
}

export default connectDB;
