const mongoose = require('mongoose');
const dns = require('dns');

// Use reliable public DNS resolvers to prevent SRV lookup failures
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  // Ignore DNS override errors
}

const connectDB = async () => {
  let mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
      console.log(`MongoDB Atlas Connected Successfully: ${conn.connection.host}`);
      return conn;
    } catch (atlasErr) {
      console.log(`MongoDB Atlas connection attempt failed (${atlasErr.message}). Switching to local database fallback...`);
    }
  }

  // Debian 12 / Linux compatibility binary version for MongoMemoryServer
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '7.0.3',
    },
  });
  mongoUri = mongoServer.getUri();

  const conn = await mongoose.connect(mongoUri);
  console.log(`Database Connected Successfully (Local Fallback: ${conn.connection.host})`);
  return conn;
};

module.exports = connectDB;
