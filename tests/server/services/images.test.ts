import sharp from "sharp";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
// Load `constants` before any direct model import — the src module graph is
// circular (models → helpers → constants → cron → services → models) and must
// be entered from the constants/services side to populate every barrel.
import "../../../src/server/constants";
import { clearTestDB, connectTestDB } from "../../helpers/db";
import {
	ensureCollectionsReady,
	newId,
	seedProperty,
	seedTenant,
	seedUnit,
	seedUser,
} from "../../helpers/seed";

// Avatar/image branches call sharp for real and upload to S3 — mock only S3.
const sendMock = vi.hoisted(() => vi.fn(async (_command?: any) => ({})));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@aws-sdk/client-s3")>();
	return {
		...actual,
		S3Client: class {
			send = sendMock;
		},
	};
});
vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: vi.fn(
		async (
			_client: unknown,
			command: { input: { Key: string } },
		) => `https://signed.example.test/${command.input.Key}`,
	),
}));

import { Tenant } from "../../../src/server/models/tenants";
import { Unit } from "../../../src/server/models/units";
import createProperty from "../../../src/server/services/properties/createProperty";
import updateProperty from "../../../src/server/services/properties/updateProperty";
import addTenant from "../../../src/server/services/tenants/addTenant";
import updateTenant from "../../../src/server/services/tenants/updateTenant";

async function tinyPng(): Promise<Buffer> {
	return sharp({
		create: {
			width: 6,
			height: 6,
			channels: 3,
			background: {
				r: Math.floor(Math.random() * 255),
				g: Math.floor(Math.random() * 255),
				b: 32,
			},
		},
	})
		.png()
		.toBuffer();
}

describe("image upload branches (S3 mocked, real sharp)", () => {
	beforeAll(async () => {
		await connectTestDB();
		await ensureCollectionsReady();
	});

	beforeEach(async () => {
		await clearTestDB();
		sendMock.mockClear();
		sendMock.mockResolvedValue({});
	});

	afterAll(async () => {
		await clearTestDB();
	});

	it("createProperty stores the resized webp image key", async () => {
		const userId = newId();
		const property = await createProperty({
			payload: {
				name: "Pictured Plaza",
				address: "9 Image Lane",
				type: "Duplex",
				totalUnits: 0,
				userId,
				image: await tinyPng(),
			},
		});

		expect(property).not.toBeNull();
		expect(property?.image).toMatch(
			/^properties\/images\/[0-9a-f]{64}\.webp$/,
		);
		expect(sendMock).toHaveBeenCalledTimes(1);
		expect(sendMock.mock.calls[0][0].input.ContentType).toBe(
			"image/webp",
		);
	});

	it("updateProperty replaces the image only when a buffer is supplied", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({ userId });

		const withImage = await updateProperty({
			id: propertyId,
			userId,
			payload: { image: await tinyPng() },
		});
		const storedImage = sendMock.mock.calls[0][0].input.Key as string;
		expect(storedImage).toMatch(
			/^properties\/images\/[0-9a-f]{64}\.webp$/,
		);
		// The read path presigns the stored key.
		expect(withImage?.image).toBe(
			`https://signed.example.test/${storedImage}`,
		);

		// No image in the payload → no upload, image untouched.
		sendMock.mockClear();
		await updateProperty({
			id: propertyId,
			userId,
			payload: { name: "No New Image" },
		});
		expect(sendMock).not.toHaveBeenCalled();
	});

	it("addTenant uploads the avatar and embeds it in the unit snapshot", async () => {
		const { userId } = await seedUser();
		const { propertyId } = await seedProperty({ userId });
		const { unitId } = await seedUnit({ userId, propertyId });

		const tenant = await addTenant({
			name: "Ava Avatar",
			phone: "+2348066666666",
			email: "ava@example.test",
			unitId,
			userId,
			moveInDate: new Date(2026, 0, 1),
			avatar: await tinyPng(),
		});

		expect(tenant).not.toBeNull();
		const stored = await Tenant.findById(tenant?.id).lean();
		expect(stored?.avatar).toMatch(
			/^tenants\/avatars\/[0-9a-f]{64}\.webp$/,
		);

		const unit = await Unit.findById(unitId).lean();
		expect(unit?.tenant?.avatar).toBe(stored?.avatar);
	});

	it("updateTenant swaps the avatar for a new upload", async () => {
		const userId = newId();
		const { propertyId } = await seedProperty({ userId });
		const { unitId } = await seedUnit({ userId, propertyId });
		const { tenantId } = await seedTenant({
			userId,
			propertyId,
			unitId,
		});

		await updateTenant({
			id: tenantId,
			userId,
			payload: { avatar: await tinyPng() },
		});

		const stored = await Tenant.findById(tenantId).lean();
		expect(stored?.avatar).toMatch(
			/^tenants\/avatars\/[0-9a-f]{64}\.webp$/,
		);
	});

	it("createProperty survives an S3 outage by storing no image", async () => {
		sendMock.mockRejectedValue(new Error("s3 down"));
		const property = await createProperty({
			payload: {
				name: "Imageless Inn",
				address: "10 Fallback Road",
				type: "House",
				totalUnits: 0,
				userId: newId(),
				image: await tinyPng(),
			},
		});
		expect(property).not.toBeNull();
		expect(property?.image).toBeUndefined();
	});
});
