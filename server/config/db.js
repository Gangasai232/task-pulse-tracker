const mongoose = require('mongoose');
const dns = require('dns');

// Use reliable public DNS resolvers to prevent Windows SRV lookup failures
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  // Ignore DNS override errors
}

const connectDB = async () => {
  let mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
      return conn;
    } catch (atlasErr) {
      console.log(`MongoDB Atlas connection unavailable. Switching to fast local database...`);
    }
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongoServer = await MongoMemoryServer.create();
  mongoUri = mongoServer.getUri();

  const conn = await mongoose.connect(mongoUri);
  console.log(`Database Connected Successfully (Local Fallback: ${conn.connection.host})`);
  return conn;
};

module.exports = connectDB;
