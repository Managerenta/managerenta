import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services", () => ({
	getOrganizationMembers: vi.fn(),
}));

import { ErrUnauthorized } from "@/server/constants";
import {
	assertOrganizationAdmin,
	assertOrganizationAdminOrManager,
} from "@/server/middleware/organizations";
import { IOrganizationRole } from "@/server/models/organizations/types";
import { getOrganizationMembers } from "@/server/services";

const mockGetMembers = vi.mocked(getOrganizationMembers);

function withMembers(
	members: Array<{ memberId: string; permission: string }>,
): void {
	mockGetMembers.mockResolvedValue({ members } as never);
}

const args = { userId: "u1", organizationId: "org1" };

beforeEach(() => {
	vi.clearAllMocks();
});

describe("assertOrganizationAdmin", () => {
	it("passes for an admin member and queries the right organization", async () => {
		withMembers([{ memberId: "u1", permission: IOrganizationRole.ADMIN }]);
		await expect(assertOrganizationAdmin(args)).resolves.toBeUndefined();
		expect(mockGetMembers).toHaveBeenCalledWith({ organizationId: "org1" });
	});

	it("rejects a manager (admin-only gate)", async () => {
		withMembers([
			{ memberId: "u1", permission: IOrganizationRole.MANAGER },
		]);
		await expect(assertOrganizationAdmin(args)).rejects.toBe(
			ErrUnauthorized,
		);
	});

	it("rejects a viewer", async () => {
		withMembers([{ memberId: "u1", permission: IOrganizationRole.VIEWER }]);
		await expect(assertOrganizationAdmin(args)).rejects.toBe(
			ErrUnauthorized,
		);
	});

	it("rejects a non-member even if others are admins", async () => {
		withMembers([
			{ memberId: "someone-else", permission: IOrganizationRole.ADMIN },
		]);
		await expect(assertOrganizationAdmin(args)).rejects.toBe(
			ErrUnauthorized,
		);
	});

	it("rejects when the organization lookup returns nothing", async () => {
		mockGetMembers.mockResolvedValue(null as never);
		await expect(assertOrganizationAdmin(args)).rejects.toBe(
			ErrUnauthorized,
		);
	});

	it("rejects when the members list is missing", async () => {
		mockGetMembers.mockResolvedValue({} as never);
		await expect(assertOrganizationAdmin(args)).rejects.toBe(
			ErrUnauthorized,
		);
	});
});

describe("assertOrganizationAdminOrManager", () => {
	it("passes for an admin", async () => {
		withMembers([{ memberId: "u1", permission: IOrganizationRole.ADMIN }]);
		await expect(
			assertOrganizationAdminOrManager(args),
		).resolves.toBeUndefined();
	});

	it("passes for a manager", async () => {
		withMembers([
			{ memberId: "u1", permission: IOrganizationRole.MANAGER },
		]);
		await expect(
			assertOrganizationAdminOrManager(args),
		).resolves.toBeUndefined();
	});

	it("rejects a viewer", async () => {
		withMembers([{ memberId: "u1", permission: IOrganizationRole.VIEWER }]);
		await expect(assertOrganizationAdminOrManager(args)).rejects.toBe(
			ErrUnauthorized,
		);
	});

	it("rejects a non-member", async () => {
		withMembers([]);
		await expect(assertOrganizationAdminOrManager(args)).rejects.toBe(
			ErrUnauthorized,
		);
	});
});
