import mongoose from "mongoose";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	createTransactionDB,
	deleteTransactionDB,
	getTransactionByIdDB,
	getTransactionsByTenantIdDB,
	sumRentCreditsByTenantIdsDB,
	Transaction,
	updateTransactionDB,
} from "../../../src/server/models/tenants/transactions";
import type { ITransactionCreateInput } from "../../../src/server/models/tenants/transactions/types";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const USER = "txn-owner-1";
const OTHER_USER = "txn-other-2";
const TENANT = "tenant-abc";
const unknownId = () => new mongoose.Types.ObjectId().toString();

function txnPayload(
	extra: Partial<ITransactionCreateInput> = {},
): ITransactionCreateInput {
	return {
		tenantId: TENANT,
		userId: USER,
		type: "rent",
		description: "Monthly rent",
		amount: 500,
		amountType: "credit",
		paymentMethod: "bank-transfer",
		date: new Date(2026, 5, 1),
		...extra,
	};
}

async function makeTxn(extra: Partial<ITransactionCreateInput> = {}) {
	const txn = await createTransactionDB({ payload: txnPayload(extra) });
	expect(txn).not.toBeNull();
	// biome-ignore lint/style/noNonNullAssertion: asserted above
	return txn!;
}

beforeAll(async () => {
	expect(process.env.DB_NAME).toMatch(/^managerenta-vitest/);
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterEach(() => {
	vi.restoreAllMocks();
});
afterAll(async () => {
	await dropTestDB();
});

describe("createTransactionDB", () => {
	it("creates a transaction with default period 1 and a string id", async () => {
		const txn = await makeTxn();
		expect(txn.id).toBeTruthy();
		expect(txn.period).toBe(1);
		const raw = await Transaction.findById(txn.id);
		expect(raw?.amount).toBe(500);
		expect(raw?.amountType).toBe("credit");
	});

	it("returns null for an invalid enum value", async () => {
		const txn = await createTransactionDB({
			payload: txnPayload({ type: "bribery" as never }),
		});
		expect(txn).toBeNull();
		expect(await Transaction.countDocuments()).toBe(0);
	});

	it("returns null when required fields are missing", async () => {
		const txn = await createTransactionDB({
			payload: { tenantId: TENANT, userId: USER } as never,
		});
		expect(txn).toBeNull();
	});
});

describe("getTransactionsByTenantIdDB", () => {
	it("returns the tenant's transactions sorted by date descending with string ids", async () => {
		const older = await makeTxn({ date: new Date(2026, 0, 1) });
		const newer = await makeTxn({ date: new Date(2026, 3, 1) });
		await makeTxn({ tenantId: "someone-else" });
		await makeTxn({ userId: OTHER_USER });

		const result = await getTransactionsByTenantIdDB({
			tenantId: TENANT,
			userId: USER,
		});
		expect(result.map((t) => t.id)).toEqual([newer.id, older.id]);
	});

	it("returns [] when the userId does not own the tenant's transactions", async () => {
		await makeTxn();
		expect(
			await getTransactionsByTenantIdDB({
				tenantId: TENANT,
				userId: OTHER_USER,
			}),
		).toEqual([]);
	});
});

describe("getTransactionByIdDB", () => {
	it("returns the transaction when id, tenantId, and userId all match", async () => {
		const txn = await makeTxn();
		const found = await getTransactionByIdDB({
			id: txn.id,
			tenantId: TENANT,
			userId: USER,
		});
		expect(found?.id).toBe(txn.id);
		expect(found?.description).toBe("Monthly rent");
	});

	it("returns null when the scope does not match", async () => {
		const txn = await makeTxn();
		expect(
			await getTransactionByIdDB({
				id: txn.id,
				tenantId: TENANT,
				userId: OTHER_USER,
			}),
		).toBeNull();
		expect(
			await getTransactionByIdDB({
				id: txn.id,
				tenantId: "wrong-tenant",
				userId: USER,
			}),
		).toBeNull();
		expect(
			await getTransactionByIdDB({
				id: unknownId(),
				tenantId: TENANT,
				userId: USER,
			}),
		).toBeNull();
	});
});

describe("updateTransactionDB", () => {
	it("updates fields and returns the after-document", async () => {
		const txn = await makeTxn();
		const result = await updateTransactionDB({
			id: txn.id,
			tenantId: TENANT,
			userId: USER,
			payload: { amount: 750, paymentMethod: "cash" },
		});
		expect(result?.amount).toBe(750);
		expect(result?.paymentMethod).toBe("cash");
		const raw = await Transaction.findById(txn.id);
		expect(raw?.amount).toBe(750);
	});

	it("returns null for a mismatched scope and leaves the doc unchanged", async () => {
		const txn = await makeTxn();
		const result = await updateTransactionDB({
			id: txn.id,
			tenantId: TENANT,
			userId: OTHER_USER,
			payload: { amount: 1 },
		});
		expect(result).toBeNull();
		const raw = await Transaction.findById(txn.id);
		expect(raw?.amount).toBe(500);
	});
});

describe("deleteTransactionDB", () => {
	it("hard-deletes the transaction and returns it", async () => {
		const txn = await makeTxn();
		const result = await deleteTransactionDB({
			id: txn.id,
			tenantId: TENANT,
			userId: USER,
		});
		expect(result?.id).toBe(txn.id);
		expect(await Transaction.findById(txn.id)).toBeNull();
	});

	it("returns null for a mismatched scope and keeps the doc", async () => {
		const txn = await makeTxn();
		const result = await deleteTransactionDB({
			id: txn.id,
			tenantId: "wrong-tenant",
			userId: USER,
		});
		expect(result).toBeNull();
		expect(await Transaction.findById(txn.id)).not.toBeNull();
	});

	it("returns null when the delete query throws (catch path)", async () => {
		const txn = await makeTxn();
		vi.spyOn(Transaction, "findOneAndDelete").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await deleteTransactionDB({
				id: txn.id,
				tenantId: TENANT,
				userId: USER,
			}),
		).toBeNull();
	});
});

describe("sumRentCreditsByTenantIdsDB", () => {
	it("sums only rent credits for the given tenants", async () => {
		await makeTxn({ amount: 100 }); // rent credit — counted
		await makeTxn({ amount: 200 }); // rent credit — counted
		await makeTxn({ amount: 400, amountType: "debit" }); // debit — excluded
		await makeTxn({ amount: 800, type: "utilities" }); // not rent — excluded
		await makeTxn({ amount: 1600, tenantId: "other-tenant" }); // other tenant — excluded

		const total = await sumRentCreditsByTenantIdsDB({
			tenantIds: [TENANT],
		});
		expect(total).toBe(300);
	});

	it("applies the 'since' cutoff", async () => {
		await makeTxn({ amount: 100, date: new Date(2026, 0, 15) });
		await makeTxn({ amount: 200, date: new Date(2026, 4, 15) });
		const total = await sumRentCreditsByTenantIdsDB({
			tenantIds: [TENANT],
			since: new Date(2026, 2, 1),
		});
		expect(total).toBe(200);
	});

	it("returns 0 for empty tenant lists or no matches", async () => {
		expect(await sumRentCreditsByTenantIdsDB({ tenantIds: [] })).toBe(0);
		expect(
			await sumRentCreditsByTenantIdsDB({ tenantIds: ["ghost-tenant"] }),
		).toBe(0);
	});

	it("returns 0 when the aggregate throws (catch path)", async () => {
		vi.spyOn(Transaction, "aggregate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(await sumRentCreditsByTenantIdsDB({ tenantIds: [TENANT] })).toBe(
			0,
		);
	});
});
