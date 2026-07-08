import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the two collaborators events.ts leans on so we can drive its
// best-effort error branches deterministically:
//   - resolveOwner's catch (getUserById throws)
//   - safeDispatch's catch (sendNotification throws)
//   - fmtMoney's catch (Intl.NumberFormat rejects a malformed currency code)
vi.mock("../../../src/server/services/users", () => ({
	getUserById: vi.fn(),
}));
vi.mock("../../../src/server/services/notifications/dispatch", () => ({
	sendNotification: vi.fn(),
}));

import { getUserById } from "../../../src/server/services/users";
import { sendNotification } from "../../../src/server/services/notifications/dispatch";
import { notifyPaymentReceived } from "../../../src/server/services/notifications/events";

const mockedGetUserById = vi.mocked(getUserById);
const mockedSendNotification = vi.mocked(sendNotification);

function ownerWithPaymentReceived() {
	return {
		email: "owner@example.test",
		phone: "+2348000000000",
		notifications: { paymentReceived: true },
	} as unknown as Awaited<ReturnType<typeof getUserById>>;
}

describe("events.ts best-effort error handling", () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it("swallows a getUserById failure and dispatches nothing (resolveOwner catch)", async () => {
		mockedGetUserById.mockRejectedValueOnce(new Error("db down"));

		await expect(
			notifyPaymentReceived({
				userId: "u1",
				tenantId: "t1",
				tenantName: "Sam",
				amount: 1000,
			}),
		).resolves.toBeUndefined();

		expect(mockedSendNotification).not.toHaveBeenCalled();
	});

	it("logs a warning when dispatch throws (safeDispatch catch)", async () => {
		mockedGetUserById.mockResolvedValueOnce(ownerWithPaymentReceived());
		mockedSendNotification.mockRejectedValueOnce(new Error("dispatch down"));
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		await expect(
			notifyPaymentReceived({
				userId: "u2",
				tenantId: "t2",
				tenantName: "Rita",
				amount: 2000,
			}),
		).resolves.toBeUndefined();

		expect(mockedSendNotification).toHaveBeenCalledTimes(1);
		expect(warnSpy).toHaveBeenCalledWith(
			"[notifications:event] dispatch failed",
			expect.objectContaining({ userId: "u2" }),
		);
	});

	it("falls back to a plain currency string when Intl rejects the code (fmtMoney catch)", async () => {
		mockedGetUserById.mockResolvedValueOnce(ownerWithPaymentReceived());
		mockedSendNotification.mockResolvedValueOnce(
			undefined as unknown as Awaited<ReturnType<typeof sendNotification>>,
		);

		await notifyPaymentReceived({
			userId: "u3",
			tenantId: "t3",
			tenantName: "Kofi",
			amount: 250000,
			// "US" is not a well-formed 3-letter ISO 4217 code → Intl throws.
			currency: "US",
		});

		expect(mockedSendNotification).toHaveBeenCalledTimes(1);
		const dispatched = mockedSendNotification.mock.calls[0][0];
		expect(dispatched.body).toContain("US 250,000");
	});
});
