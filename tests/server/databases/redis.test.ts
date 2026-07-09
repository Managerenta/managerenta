import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import {
	disconnectRedis,
	Redis,
	redisDeleteKeys,
	redisRetrieveKeyString,
	redisUpdateKeyString,
} from "../../../src/server/databases";

const PREFIX = `vitest:redis:${randomUUID()}`;
const key = (name: string) => `${PREFIX}:${name}`;

afterAll(async () => {
	const leftovers = await Redis.keys(`${PREFIX}:*`);
	if (leftovers.length) await Redis.del(leftovers);
	await disconnectRedis();
});

describe("redisUpdateKeyString / redisRetrieveKeyString", () => {
	it("stores JSON with a default 60s TTL and reads it back typed", async () => {
		const value = { hello: "world", n: 42 };
		expect(await redisUpdateKeyString(key("default-ttl"), value)).toBe(
			true,
		);

		const ttl = await Redis.ttl(key("default-ttl"));
		expect(ttl).toBeGreaterThan(0);
		expect(ttl).toBeLessThanOrEqual(60);

		const roundTrip = await redisRetrieveKeyString<typeof value>(
			key("default-ttl"),
		);
		expect(roundTrip).toEqual(value);
	});

	it("honours a custom TTL in seconds", async () => {
		expect(
			await redisUpdateKeyString(key("custom-ttl"), "v", true, 120),
		).toBe(true);
		const ttl = await Redis.ttl(key("custom-ttl"));
		expect(ttl).toBeGreaterThan(60);
		expect(ttl).toBeLessThanOrEqual(120);
	});

	it("persists without expiry when expire=false", async () => {
		expect(
			await redisUpdateKeyString(key("no-ttl"), [1, 2, 3], false),
		).toBe(true);
		expect(await Redis.ttl(key("no-ttl"))).toBe(-1); // -1: exists, no TTL
		expect(await redisRetrieveKeyString<number[]>(key("no-ttl"))).toEqual([
			1, 2, 3,
		]);
	});

	it("returns undefined for a missing key", async () => {
		expect(await redisRetrieveKeyString(key("never-set"))).toBeUndefined();
	});

	it("actually expires: a 1s key is gone after its TTL", async () => {
		expect(
			await redisUpdateKeyString(key("short"), "gone-soon", true, 1),
		).toBe(true);
		expect(await redisRetrieveKeyString<string>(key("short"))).toBe(
			"gone-soon",
		);
		await new Promise((r) => setTimeout(r, 1300));
		expect(await redisRetrieveKeyString(key("short"))).toBeUndefined();
	});
});

describe("redisDeleteKeys", () => {
	it("returns false when called with no keys or when nothing matches", async () => {
		expect(await redisDeleteKeys()).toBe(false);
		expect(await redisDeleteKeys(key("no-match-*"))).toBe(false);
	});

	it("deletes a single exact key and returns true", async () => {
		await redisUpdateKeyString(key("single"), "x", false);
		expect(await redisDeleteKeys(key("single"))).toBe(true);
		expect(await Redis.exists(key("single"))).toBe(0);
	});

	it("deletes by glob pattern", async () => {
		await redisUpdateKeyString(key("glob:a"), 1, false);
		expect(await redisDeleteKeys(`${PREFIX}:glob:*`)).toBe(true);
		expect(await Redis.exists(key("glob:a"))).toBe(0);
	});

	it("removes every matched key and reports success when more than one matches", async () => {
		await redisUpdateKeyString(key("multi:a"), 1, false);
		await redisUpdateKeyString(key("multi:b"), 2, false);

		// A glob matching 2+ keys deletes them all and returns true (del()
		// returns the count; the helper reports success on count > 0).
		const result = await redisDeleteKeys(`${PREFIX}:multi:*`);
		expect(result).toBe(true);
		expect(await Redis.exists(key("multi:a"), key("multi:b"))).toBe(0);
	});
});
