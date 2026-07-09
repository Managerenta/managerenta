import mongoose from "mongoose";
import { Property } from "../../src/server/models/properties";
import { Tenant } from "../../src/server/models/tenants";
import { Transaction } from "../../src/server/models/tenants/transactions";
import { Unit } from "../../src/server/models/units";
import { User } from "../../src/server/models/users";

export function newId(): string {
	return new mongoose.Types.ObjectId().toString();
}

/**
 * Pre-create collections and wait for index builds. Multi-document
 * transactions abort with a transient "catalog changes; please retry" error
 * when they race the very first collection/index creation in a fresh scratch
 * DB — creating everything up front makes transactional services
 * deterministic in tests. Call once from beforeAll (after connectTestDB).
 */
export async function ensureCollectionsReady(): Promise<void> {
	await Promise.all(
		[User, Property, Unit, Tenant, Transaction].map(async (model) => {
			await model.createCollection().catch(() => {});
			await model.init().catch(() => {});
		}),
	);
}

let seq = 0;
function next(): number {
	seq += 1;
	return seq;
}

/** Create a real user document (schema defaults for notifications/reminders apply). */
export async function seedUser(
	overrides: Record<string, unknown> = {},
): Promise<{ userId: string; doc: InstanceType<typeof User> }> {
	const n = next();
	const stamp = `${Date.now()}-${process.pid}-${n}`;
	const doc = await User.create({
		username: `vitest-user-${stamp}`,
		email: `vitest-${stamp}@example.test`,
		password: "s3cret-password",
		name: "Vitest Owner",
		...overrides,
	});
	return { userId: doc._id.toString(), doc };
}

export async function seedProperty({
	userId,
	...overrides
}: { userId: string } & Record<string, unknown>): Promise<{
	propertyId: string;
	doc: InstanceType<typeof Property>;
}> {
	const doc = await Property.create({
		name: `Property ${next()}`,
		address: "1 Test Street",
		type: "Apartment",
		totalUnits: 0,
		userId,
		...overrides,
	});
	return { propertyId: doc._id.toString(), doc };
}

export async function seedUnit({
	userId,
	propertyId,
	...overrides
}: {
	userId: string;
	propertyId: string;
} & Record<string, unknown>): Promise<{
	unitId: string;
	doc: InstanceType<typeof Unit>;
}> {
	const doc = await Unit.create({
		name: `Unit ${next()}`,
		rent: 1000,
		propertyId,
		userId,
		...overrides,
	});
	return { unitId: doc._id.toString(), doc };
}

export async function seedTenant({
	userId,
	propertyId,
	unitId,
	...overrides
}: {
	userId: string;
	propertyId: string;
	unitId: string;
} & Record<string, unknown>): Promise<{
	tenantId: string;
	doc: InstanceType<typeof Tenant>;
}> {
	const n = next();
	const doc = await Tenant.create({
		name: `Tenant ${n}`,
		phone: `+2348000000${String(n).padStart(3, "0")}`,
		email: `tenant-${n}-${Date.now()}@example.test`,
		unitId,
		propertyId,
		userId,
		moveInDate: new Date(),
		...overrides,
	});
	return { tenantId: doc._id.toString(), doc };
}

export async function seedTransaction({
	userId,
	tenantId,
	...overrides
}: {
	userId: string;
	tenantId: string;
} & Record<string, unknown>): Promise<{
	transactionId: string;
	doc: InstanceType<typeof Transaction>;
}> {
	const doc = await Transaction.create({
		tenantId,
		userId,
		type: "rent",
		description: "Rent payment",
		amount: 1000,
		amountType: "credit",
		paymentMethod: "cash",
		date: new Date(),
		...overrides,
	});
	return { transactionId: doc._id.toString(), doc };
}

/**
 * Poll until `predicate` resolves truthy (for fire-and-forget side effects
 * like `void notifyTenantMoveIn(...)`). Throws after `timeoutMs`.
 */
export async function waitFor<T>(
	predicate: () => Promise<T | null | undefined | false>,
	{
		timeoutMs = 5000,
		intervalMs = 50,
	}: {
		timeoutMs?: number;
		intervalMs?: number;
	} = {},
): Promise<T> {
	const deadline = Date.now() + timeoutMs;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const value = await predicate();
		if (value) return value as T;
		if (Date.now() > deadline) {
			throw new Error("waitFor: condition not met in time");
		}
		await new Promise((r) => setTimeout(r, intervalMs));
	}
}
