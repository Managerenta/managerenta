import mongoose from "mongoose";
import { connectMongoDB } from "../../src/server/databases";

/**
 * Connect to this worker's scratch database (see tests/setup.ts for the
 * per-worker DB_NAME). Call from beforeAll in tests that hit real models.
 */
export async function connectTestDB(): Promise<void> {
	await connectMongoDB();
}

/** Wipe every collection in the scratch DB. Call from beforeEach/afterAll. */
export async function clearTestDB(): Promise<void> {
	const db = mongoose.connection.db;
	if (!db) return;
	const collections = await db.collections();
	await Promise.all(collections.map((c) => c.deleteMany({})));
}

/** Drop the scratch DB entirely and close the connection. */
export async function dropTestDB(): Promise<void> {
	if (mongoose.connection.readyState !== 0) {
		await mongoose.connection.dropDatabase().catch(() => {});
		await mongoose.disconnect().catch(() => {});
	}
}
