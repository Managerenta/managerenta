import { describe, expect, it } from "vitest";
import {
	addTenantBodySchema,
	addTransactionBodySchema,
	getTenantsQuerySchema,
	tenantParamsSchema,
	transactionParamsSchema,
	updateTenantBodySchema,
	updateTransactionBodySchema,
} from "@/server/validators/tenants/validate";

const validTenant = {
	name: "Jane Doe",
	phone: "08012345678",
	email: "jane@example.com",
	unitId: "unit-1",
	moveInDate: "2026-01-01",
};

describe("addTenantBodySchema", () => {
	it("accepts a valid tenant and coerces moveInDate", () => {
		const result = addTenantBodySchema.safeParse(validTenant);
		expect(result.success).toBe(true);
		expect(result.data?.moveInDate).toBeInstanceOf(Date);
		expect(result.data?.moveInDate.toISOString()).toContain("2026-01-01");
	});

	it("requires name, phone, email, unitId and moveInDate", () => {
		for (const key of ["name", "phone", "email", "unitId", "moveInDate"]) {
			const body: Record<string, unknown> = { ...validTenant };
			delete body[key];
			expect(addTenantBodySchema.safeParse(body).success).toBe(false);
		}
	});

	it("rejects invalid emails", () => {
		expect(
			addTenantBodySchema.safeParse({ ...validTenant, email: "nope" })
				.success,
		).toBe(false);
	});

	it("enforces phone length 7..20", () => {
		expect(
			addTenantBodySchema.safeParse({ ...validTenant, phone: "123456" })
				.success,
		).toBe(false);
		expect(
			addTenantBodySchema.safeParse({ ...validTenant, phone: "1234567" })
				.success,
		).toBe(true);
		expect(
			addTenantBodySchema.safeParse({
				...validTenant,
				phone: "1".repeat(21),
			}).success,
		).toBe(false);
	});

	it("treats empty-string leaseExpiry/rentDueDay as undefined", () => {
		const result = addTenantBodySchema.safeParse({
			...validTenant,
			leaseExpiry: "",
			rentDueDay: "",
		});
		expect(result.success).toBe(true);
		expect(result.data?.leaseExpiry).toBeUndefined();
		expect(result.data?.rentDueDay).toBeUndefined();
	});

	it("bounds rentDueDay to 1..28 and coerces from string", () => {
		const ok = addTenantBodySchema.safeParse({
			...validTenant,
			rentDueDay: "14",
		});
		expect(ok.success).toBe(true);
		expect(ok.data?.rentDueDay).toBe(14);

		expect(
			addTenantBodySchema.safeParse({ ...validTenant, rentDueDay: 0 })
				.success,
		).toBe(false);
		expect(
			addTenantBodySchema.safeParse({ ...validTenant, rentDueDay: 29 })
				.success,
		).toBe(false);
		expect(
			addTenantBodySchema.safeParse({ ...validTenant, rentDueDay: 28 })
				.success,
		).toBe(true);
	});

	it("rejects an unparseable moveInDate", () => {
		expect(
			addTenantBodySchema.safeParse({
				...validTenant,
				moveInDate: "yesterday-ish",
			}).success,
		).toBe(false);
	});
});

describe("updateTenantBodySchema", () => {
	it("accepts an empty body (all optional)", () => {
		expect(updateTenantBodySchema.safeParse({}).success).toBe(true);
	});

	it("treats empty-string moveInDate as undefined on update", () => {
		const result = updateTenantBodySchema.safeParse({ moveInDate: "" });
		expect(result.success).toBe(true);
		expect(result.data?.moveInDate).toBeUndefined();
	});

	it("still validates provided fields", () => {
		expect(
			updateTenantBodySchema.safeParse({ email: "broken" }).success,
		).toBe(false);
		expect(updateTenantBodySchema.safeParse({ name: "" }).success).toBe(
			false,
		);
	});
});

describe("tenantParamsSchema / transactionParamsSchema", () => {
	it("tenant params require non-empty id, strict", () => {
		expect(tenantParamsSchema.safeParse({ id: "t1" }).success).toBe(true);
		expect(tenantParamsSchema.safeParse({ id: "" }).success).toBe(false);
		expect(tenantParamsSchema.safeParse({ id: "t1", q: 1 }).success).toBe(
			false,
		);
	});

	it("transaction params require both id and txId", () => {
		expect(
			transactionParamsSchema.safeParse({ id: "t1", txId: "x1" }).success,
		).toBe(true);
		expect(transactionParamsSchema.safeParse({ id: "t1" }).success).toBe(
			false,
		);
		expect(
			transactionParamsSchema.safeParse({ id: "t1", txId: "" }).success,
		).toBe(false);
	});
});

describe("getTenantsQuerySchema", () => {
	it("accepts filters and coerces pagination", () => {
		const result = getTenantsQuerySchema.safeParse({
			limit: "5",
			offset: "0",
			status: "Active",
			search: "jane",
			sort: "name",
		});
		expect(result.success).toBe(true);
		expect(result.data?.limit).toBe(5);
	});

	it("rejects unknown status values", () => {
		expect(
			getTenantsQuerySchema.safeParse({ status: "Paused" }).success,
		).toBe(false);
		expect(getTenantsQuerySchema.safeParse({ status: "all" }).success).toBe(
			true,
		);
	});
});

describe("addTransactionBodySchema", () => {
	const validTx = {
		type: "rent",
		amount: "1200",
		paymentMethod: "bank-transfer",
		date: "2026-02-01",
	};

	it("applies defaults: amountType credit, period 1", () => {
		const result = addTransactionBodySchema.safeParse(validTx);
		expect(result.success).toBe(true);
		expect(result.data?.amountType).toBe("credit");
		expect(result.data?.period).toBe(1);
		expect(result.data?.amount).toBe(1200);
		expect(result.data?.date).toBeInstanceOf(Date);
	});

	it("bounds period to 1..120", () => {
		expect(
			addTransactionBodySchema.safeParse({ ...validTx, period: "120" })
				.success,
		).toBe(true);
		expect(
			addTransactionBodySchema.safeParse({ ...validTx, period: "121" })
				.success,
		).toBe(false);
		expect(
			addTransactionBodySchema.safeParse({ ...validTx, period: 0 }).success,
		).toBe(false);
	});

	it("rejects negative amounts and unknown payment methods", () => {
		expect(
			addTransactionBodySchema.safeParse({ ...validTx, amount: -5 })
				.success,
		).toBe(false);
		expect(
			addTransactionBodySchema.safeParse({
				...validTx,
				paymentMethod: "crypto",
			}).success,
		).toBe(false);
	});

	it("requires type, amount, paymentMethod and date", () => {
		expect(addTransactionBodySchema.safeParse({}).success).toBe(false);
		expect(
			addTransactionBodySchema.safeParse({
				type: "rent",
				amount: 10,
				paymentMethod: "cash",
			}).success,
		).toBe(false);
	});
});

describe("updateTransactionBodySchema", () => {
	it("accepts an empty body and partial updates", () => {
		expect(updateTransactionBodySchema.safeParse({}).success).toBe(true);
		const result = updateTransactionBodySchema.safeParse({
			amount: "300",
			amountType: "debit",
			date: "",
			period: "",
		});
		expect(result.success).toBe(true);
		expect(result.data?.amount).toBe(300);
		expect(result.data?.date).toBeUndefined();
		expect(result.data?.period).toBeUndefined();
	});

	it("rejects invalid enum values", () => {
		expect(
			updateTransactionBodySchema.safeParse({ type: "fees" }).success,
		).toBe(false);
		expect(
			updateTransactionBodySchema.safeParse({ amountType: "refund" })
				.success,
		).toBe(false);
	});

	it("bounds period 1..120 when provided", () => {
		expect(
			updateTransactionBodySchema.safeParse({ period: 121 }).success,
		).toBe(false);
		expect(
			updateTransactionBodySchema.safeParse({ period: 1 }).success,
		).toBe(true);
	});
});
