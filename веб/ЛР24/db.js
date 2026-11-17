const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const database = process.env.MONGODB_DB || 'bbmo_01_23';

async function connect() {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    try {
        await client.connect();
        const db = client.db(database);
        await db.command({ ping: 1 });
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        return { client, db };
    } catch (error) {
        await client.close();
        throw error;
    }
}

module.exports = { connect };
