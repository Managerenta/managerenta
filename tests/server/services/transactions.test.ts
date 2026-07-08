import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ErrTenantNotFound } from "../../../src/server/constants";
import { Notification } from "../../../src/server/models/notifications";
import { Transaction } from "../../../src/server/models/tenants/transactions";
import addTransaction from "../../../src/server/services/tenants/transactions/addTransaction";
import deleteTransaction from "../../../src/server/services/tenants/transactions/deleteTransaction";
import listTransactions from "../../../src/server/services/tenants/transactions/listTransactions";
import updateTransaction from "../../../src/server/services/tenants/transactions/updateTransaction";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import {
	newId,
	seedProperty,
	seedTenant,
	seedUnit,
	seedUser,
	waitFor,
} from "../../helpers/seed";

async function seedScenario(rentDueDay = 5) {
	const { userId } = await seedUser();
	const { propertyId } = await seedProperty({ userId });
	const { unitId } = await seedUnit({
		userId,
		propertyId,
		name: "TX Unit",
		rent: 1000,
	});
	const { tenantId } = await seedTenant({
		userId,
		propertyId,
		unitId,
		name: "Payer Pat",
		rentDueDay,
	});
	return { userId, propertyId, unitId, tenantId };
}

describe("tenant transactions service", () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	beforeEach(async () => {
		await clearTestDB();
	});

	afterAll(async () => {
		await clearTestDB();
	});

	describe("addTransaction", () => {
		it("creates a rent credit with a period window anchored on the tenant's rent due day", async () => {
			const { userId, tenantId } = await seedScenario(5);

			const tx = await addTransaction({
				tenantId,
				userId,
				type: "rent",
				amount: 2000,
				amountType: "credit",
				paymentMethod: "bank-transfer",
				date: new Date(2026, 6, 8), // 8 Jul 2026
				period: 2,
			});

			expect(tx).not.toBeNull();
			expect(tx?.description).toBe("Rent payment — 2 months");
			expect(tx?.period).toBe(2);
			// periodStart = due day in the tx month, periodEnd = last day of
			// the final covered month.
			expect(new Date(tx?.periodStart as Date)).toEqual(
				new Date(2026, 6, 5),
			);
			expect(new Date(tx?.periodEnd as Date)).toEqual(
				new Date(2026, 7, 31),
			);

			// A rent credit triggers the payment-received event notification.
			const note = await waitFor(() =>
				Notification.findOne({
					userId,
					kind: "payment-received",
				}).lean(),
			);
			expect(note.body).toContain("Payer Pat");
			expect(note.body).toContain("TX Unit");
		});

		it("uses a single-month default period and description for rent credits", async () => {
			const { userId, tenantId } = await seedScenario(1);

			const tx = await addTransaction({
				tenantId,
				userId,
				type: "rent",
				amount: 1000,
				amountType: "credit",
				paymentMethod: "cash",
				date: new Date(2026, 2, 15), // 15 Mar 2026
			});

			expect(tx?.description).toBe("Rent payment");
			expect(new Date(tx?.periodStart as Date)).toEqual(
				new Date(2026, 2, 1),
			);
			expect(new Date(tx?.periodEnd as Date)).toEqual(
				new Date(2026, 2, 31),
			);
		});

		it("does not attach a period window to non-rent or debit transactions", async () => {
			const { userId, tenantId } = await seedScenario();

			const tx = await addTransaction({
				tenantId,
				userId,
				type: "maintenance",
				amount: 300,
				amountType: "debit",
				paymentMethod: "cash",
				date: new Date(2026, 6, 8),
			});

			expect(tx?.periodStart).toBeUndefined();
			expect(tx?.periodEnd).toBeUndefined();
			// Description falls back to the type name.
			expect(tx?.description).toBe("maintenance");
		});

		it("ACTUAL BEHAVIOUR: negative amounts are accepted — no min(0) constraint exists on the schema", async () => {
			// The transaction schema declares `amount: { type: Number,
			// required: true }` with no `min`. This test pins the current
			// behaviour; if a min(0) validator is ever added it will fail and
			// should then assert `toBeNull()` instead.
			const { userId, tenantId } = await seedScenario();

			const tx = await addTransaction({
				tenantId,
				userId,
				type: "other",
				amount: -50,
				amountType: "debit",
				paymentMethod: "cash",
				date: new Date(),
			});

			expect(tx).not.toBeNull();
			expect(tx?.amount).toBe(-50);
		});

		it("throws ErrTenantNotFound for an unknown tenant", async () => {
			const { userId } = await seedUser();
			await expect(
				addTransaction({
					tenantId: newId(),
					userId,
					type: "rent",
					amount: 100,
					amountType: "credit",
					paymentMethod: "cash",
					date: new Date(),
				}),
			).rejects.toBe(ErrTenantNotFound);
		});
	});

	describe("listTransactions", () => {
		it("returns the tenant's transactions sorted by date desc with a total", async () => {
			const { userId, tenantId } = await seedScenario();
			await addTransaction({
				tenantId,
				userId,
				type: "rent",
				amount: 1000,
				amountType: "credit",
				paymentMethod: "cash",
				date: new Date(2026, 0, 5),
			});
			await addTransaction({
				tenantId,
				userId,
				type: "utilities",
				amount: 90,
				amountType: "debit",
				paymentMethod: "cash",
				date: new Date(2026, 1, 10),
			});

			const { transactions, total } = await listTransactions({
				tenantId,
				userId,
			});
			expect(total).toBe(2);
			expect(transactions.map((t) => t.type)).toEqual([
				"utilities",
				"rent",
			]);
		});

		it("throws ErrTenantNotFound when listing for a foreign tenant", async () => {
			const { tenantId } = await seedScenario();
			await expect(
				listTransactions({ tenantId, userId: newId() }),
			).rejects.toBe(ErrTenantNotFound);
		});
	});

	describe("updateTransaction", () => {
		it("recomputes the period window when type/amountType/date identify a rent credit", async () => {
			const { userId, tenantId } = await seedScenario(10);
			const tx = await addTransaction({
				tenantId,
				userId,
				type: "other",
				amount: 500,
				amountType: "debit",
				paymentMethod: "cash",
				date: new Date(2026, 3, 2),
			});

			const updated = await updateTransaction({
				id: tx?.id as string,
				tenantId,
				userId,
				payload: {
					type: "rent",
					amountType: "credit",
					date: new Date(2026, 4, 12), // 12 May 2026
					period: 1,
					amount: 1000,
				},
			});

			expect(updated?.type).toBe("rent");
			expect(new Date(updated?.periodStart as Date)).toEqual(
				new Date(2026, 4, 10),
			);
			expect(new Date(updated?.periodEnd as Date)).toEqual(
				new Date(2026, 4, 31),
			);
		});

		it("applies partial updates without recomputing the period", async () => {
			const { userId, tenantId } = await seedScenario(5);
			const tx = await addTransaction({
				tenantId,
				userId,
				type: "rent",
				amount: 1000,
				amountType: "credit",
				paymentMethod: "cash",
				date: new Date(2026, 6, 8),
			});
			const originalStart = new Date(tx?.periodStart as Date);

			const updated = await updateTransaction({
				id: tx?.id as string,
				tenantId,
				userId,
				payload: { amount: 1234 },
			});

			expect(updated?.amount).toBe(1234);
			expect(new Date(updated?.periodStart as Date)).toEqual(
				originalStart,
			);
		});

		it("returns null for a transaction that does not match tenant+user scope", async () => {
			const scenarioA = await seedScenario();
			const scenarioB = await seedScenario();
			const tx = await addTransaction({
				tenantId: scenarioA.tenantId,
				userId: scenarioA.userId,
				type: "rent",
				amount: 100,
				amountType: "credit",
				paymentMethod: "cash",
				date: new Date(),
			});

			const crossTenant = await updateTransaction({
				id: tx?.id as string,
				tenantId: scenarioB.tenantId,
				userId: scenarioB.userId,
				payload: { amount: 1 },
			});
			expect(crossTenant).toBeNull();
		});
	});

	describe("deleteTransaction", () => {
		it("hard-deletes the transaction within tenant+user scope", async () => {
			const { userId, tenantId } = await seedScenario();
			const tx = await addTransaction({
				tenantId,
				userId,
				type: "rent",
				amount: 700,
				amountType: "credit",
				paymentMethod: "card",
				date: new Date(),
			});

			const deleted = await deleteTransaction({
				id: tx?.id as string,
				tenantId,
				userId,
			});
			expect(deleted?.id).toBe(tx?.id);

			const remaining = await Transaction.countDocuments({ tenantId });
			expect(remaining).toBe(0);
		});

		it("returns null when scoped to the wrong owner", async () => {
			const { userId, tenantId } = await seedScenario();
			const tx = await addTransaction({
				tenantId,
				userId,
				type: "rent",
				amount: 700,
				amountType: "credit",
				paymentMethod: "card",
				date: new Date(),
			});

			const result = await deleteTransaction({
				id: tx?.id as string,
				tenantId,
				userId: newId(),
			});
			expect(result).toBeNull();
			expect(await Transaction.countDocuments({ tenantId })).toBe(1);
		});
	});
});
