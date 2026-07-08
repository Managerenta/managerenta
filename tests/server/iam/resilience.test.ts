import mongoose from "mongoose";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

// Intercept the IAM model layer so we can force DB-write failures and assert
// that seeding and migration degrade gracefully (fail closed / skip) instead of
// throwing. seed/system-policies and migrate/roles-to-iam import these same
// functions, so the mocks reach their internals.
vi.mock("../../../src/server/iam/models", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../../../src/server/iam/models")>();
	return {
		...actual,
		findIamPolicyByNameDB: vi.fn(),
		createIamPolicyDB: vi.fn(),
		findIamGroupByNameDB: vi.fn(),
		createIamGroupDB: vi.fn(),
		setGroupAttachedPoliciesDB: vi.fn(),
		addMembershipDB: vi.fn(),
	};
});

import { migrateRolesToIam } from "../../../src/server/iam/migrate/roles-to-iam";
import {
	addMembershipDB,
	createIamGroupDB,
	createIamPolicyDB,
	findIamGroupByNameDB,
	findIamPolicyByNameDB,
} from "../../../src/server/iam/models";
import {
	seedOrgOwnerAdmin,
	seedOrgSystemGroups,
	seedPlatformSystemPolicies,
} from "../../../src/server/iam/seed/system-policies";
import { Organization } from "../../../src/server/models/organizations";
import { IOrganizationRole } from "../../../src/server/models/organizations/types";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
	vi.clearAllMocks();
});
afterAll(async () => {
	await dropTestDB();
});

describe("policy creation failure", () => {
	beforeEach(() => {
		vi.mocked(findIamPolicyByNameDB).mockResolvedValue(null);
		vi.mocked(createIamPolicyDB).mockResolvedValue(null);
	});

	it("seedOrgSystemGroups returns null and seed helpers fail closed", async () => {
		expect(await seedOrgSystemGroups(oid().toString())).toBeNull();
		expect(await seedPlatformSystemPolicies()).toBe(false);
		expect(
			await seedOrgOwnerAdmin(oid().toString(), oid().toString()),
		).toBe(false);
	});

	it("migration skips an org whose groups cannot be seeded", async () => {
		await Organization.create({
			ownerId: oid(),
			name: `res-a-${Date.now()}`,
			description: "resilience org a",
			members: [{ memberId: oid(), permission: IOrganizationRole.ADMIN }],
		});
		const report = await migrateRolesToIam();
		expect(report.organizations).toBe(1);
		expect(report.skipped).toBeGreaterThanOrEqual(1);
		expect(report.members).toBe(0);
		expect(report.owners).toBe(0);
	});
});

describe("membership write failure (groups seed OK)", () => {
	beforeEach(() => {
		vi.mocked(findIamPolicyByNameDB).mockResolvedValue(null);
		vi.mocked(createIamPolicyDB).mockResolvedValue({
			_id: oid(),
		} as unknown as Awaited<ReturnType<typeof createIamPolicyDB>>);
		vi.mocked(findIamGroupByNameDB).mockResolvedValue(null);
		vi.mocked(createIamGroupDB).mockResolvedValue({
			_id: oid(),
			attachedPolicyIds: [],
		} as unknown as Awaited<ReturnType<typeof createIamGroupDB>>);
		vi.mocked(addMembershipDB).mockResolvedValue(null);
	});

	it("seedOrgOwnerAdmin returns false when the membership write fails", async () => {
		expect(
			await seedOrgOwnerAdmin(oid().toString(), oid().toString()),
		).toBe(false);
	});

	it("migration counts owner + members as skipped when memberships fail", async () => {
		await Organization.create({
			ownerId: oid(),
			name: `res-b-${Date.now()}`,
			description: "resilience org b",
			members: [
				{ memberId: oid(), permission: IOrganizationRole.MANAGER },
			],
		});
		const report = await migrateRolesToIam();
		expect(report.owners).toBe(0);
		expect(report.members).toBe(0);
		expect(report.skipped).toBeGreaterThanOrEqual(1);
	});
});
