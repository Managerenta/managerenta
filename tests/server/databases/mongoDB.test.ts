import mongoose from "mongoose";
import { afterAll, describe, expect, it } from "vitest";

import {
	connectMongoDB,
	disconnectMongoDB,
} from "../../../src/server/databases";

afterAll(async () => {
	// drop the scratch DB before letting go of the connection
	try {
		const conn = await connectMongoDB();
		await conn.connection.dropDatabase();
	} catch {
		// already disconnected — nothing to clean
	}
	await disconnectMongoDB();
});

describe("connectMongoDB", () => {
	it("connects to the per-worker scratch database (never `managerenta`)", async () => {
		const conn = await connectMongoDB();
		expect(conn.connection.readyState).toBe(1);
		expect(conn.connection.db?.databaseName).toBe(process.env.DB_NAME);
		expect(conn.connection.db?.databaseName).toMatch(
			/^managerenta-vitest-/,
		);
		expect(conn.connection.db?.databaseName).not.toBe("managerenta");
	});

	it("is idempotent: repeated calls return the same cached instance", async () => {
		const first = await connectMongoDB();
		const second = await connectMongoDB();
		const third = await connectMongoDB();
		expect(second).toBe(first);
		expect(third).toBe(first);
		expect(mongoose.connection.readyState).toBe(1);
	});

	it("supports round-trip writes on the scratch DB", async () => {
		const conn = await connectMongoDB();
		const col = conn.connection.db!.collection("vitest_smoke");
		await col.insertOne({ probe: "mongoDB.test", at: new Date() });
		expect(await col.countDocuments({ probe: "mongoDB.test" })).toBe(1);
		await col.deleteMany({});
	});
});

describe("disconnectMongoDB", () => {
	it("disconnects and clears the cache so a fresh connect works", async () => {
		await connectMongoDB();
		await disconnectMongoDB();
		expect(mongoose.connection.readyState).toBe(0);

		// calling again while disconnected is a safe no-op
		await expect(disconnectMongoDB()).resolves.toBeUndefined();
		expect(mongoose.connection.readyState).toBe(0);

		// reconnect after disconnect must establish a live connection again
		const again = await connectMongoDB();
		expect(again.connection.readyState).toBe(1);
		expect(again.connection.db?.databaseName).toBe(process.env.DB_NAME);
	});
});
