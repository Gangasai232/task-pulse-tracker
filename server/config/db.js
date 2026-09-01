const mongoose = require('mongoose');
const dns = require('dns');

// Use reliable public DNS resolvers to prevent Windows SRV lookup failures
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('Could not override DNS servers:', dnsErr.message);
}

const connectDB = async () => {
  let mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (atlasErr) {
      console.warn(`\n⚠️ Primary MONGODB_URI connection failed (${atlasErr.message}).`);
      console.warn(`Falling back to in-memory database server...\n`);
    }
  }

  console.log('Initializing in-memory MongoDB server fallback...');
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongoServer = await MongoMemoryServer.create();
  mongoUri = mongoServer.getUri();
  console.log(`In-memory MongoDB started at: ${mongoUri}`);

  const conn = await mongoose.connect(mongoUri);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
