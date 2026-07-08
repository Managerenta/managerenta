/* biome-ignore-all lint/suspicious/noExplicitAny: seed script intentionally loose on schema types */
import mongoose from "mongoose";
import { connectMongoDB, disconnectMongoDB } from "../src/server/databases";
import {
	AuditEvent as _AuditEvent,
	DocumentModel as _DocumentModel,
	MaintenanceRequest as _MaintenanceRequest,
	Notification as _Notification,
	Organization as _Organization,
	Property as _Property,
	PushSubscription as _PushSubscription,
	Tenant as _Tenant,
	Unit as _Unit,
	User as _User,
	Vendor as _Vendor,
} from "../src/server/models";
import { Transaction as _Transaction } from "../src/server/models/tenants/transactions";

// Cast models to `any` to bypass mongoose's strict `create()` overload union
// resolution. Seed scripts don't benefit from full schema type safety.
const User = _User as any;
const Property = _Property as any;
const Unit = _Unit as any;
const Tenant = _Tenant as any;
const Transaction = _Transaction as any;
const Organization = _Organization as any;
const Vendor = _Vendor as any;
const MaintenanceRequest = _MaintenanceRequest as any;
const DocumentModel = _DocumentModel as any;
const Notification = _Notification as any;
const AuditEvent = _AuditEvent as any;
const PushSubscription = _PushSubscription as any;

async function clean() {
	await Promise.all([
		User.deleteMany({}),
		Property.deleteMany({}),
		Unit.deleteMany({}),
		Tenant.deleteMany({}),
		Transaction.deleteMany({}),
		Organization.deleteMany({}),
		Vendor.deleteMany({}),
		MaintenanceRequest.deleteMany({}),
		DocumentModel.deleteMany({}),
		Notification.deleteMany({}),
		AuditEvent.deleteMany({}),
		PushSubscription.deleteMany({}),
	]);
}

function daysAgo(n: number): Date {
	return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n: number): Date {
	return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function run() {
	// SECURITY: this script wipes every collection and seeds known-weak
	// passwords. Refuse to touch a production database under any
	// circumstances. See SECURITY_REVIEW.md M10.
	if (process.env.NODE_ENV === "production") {
		throw new Error("Refusing to run seed.ts with NODE_ENV=production");
	}
	const uri = process.env.MONGODB_URI ?? "";
	if (uri.includes("mongodb+srv://") || uri.includes("mongodb.net")) {
		throw new Error(
			"Refusing to run seed.ts against what looks like a hosted MongoDB cluster",
		);
	}

	console.log("Connecting to MongoDB…");
	await connectMongoDB();

	console.log("Clearing existing collections…");
	await clean();

	console.log("Seeding users…");
	// The User schema's pre-save hook bcrypt-hashes plaintext passwords.
	const [landlord, secondary] = await User.create([
		{
			username: "abdullah",
			email: "abdullah@example.com",
			password: "password123",
			name: "Abdullah Zakariyya",
			phone: "+2348032197766",
			avatar: "https://i.pravatar.cc/200?img=12",
		},
		{
			username: "amina",
			email: "amina@example.com",
			password: "password123",
			name: "Amina Yusuf",
			phone: "+2348033456712",
			avatar: "https://i.pravatar.cc/200?img=44",
		},
	]);

	if (!landlord || !secondary) throw new Error("User creation failed");
	const landlordId = landlord._id.toString();

	console.log("Seeding properties…");
	const [maitamaTowers, ikoyiSuites, lekkiVilla] = await Property.create([
		{
			name: "Maitama Heights",
			address: "12 Yedseram Crescent, Maitama, Abuja",
			type: "Highrise",
			totalUnits: 4,
			monthlyRent: 450000,
			description:
				"4-floor secured apartment building with 24/7 power and water.",
			userId: landlordId,
		},
		{
			name: "Ikoyi Service Suites",
			address: "5 Bourdillon Road, Ikoyi, Lagos",
			type: "Apartment",
			totalUnits: 3,
			monthlyRent: 750000,
			description: "Premium service apartments with concierge and gym.",
			userId: landlordId,
		},
		{
			name: "Lekki Phase 1 Villa",
			address: "21 Admiralty Way, Lekki Phase 1, Lagos",
			type: "Duplex",
			totalUnits: 2,
			monthlyRent: 1200000,
			description: "Detached duplex split into two self-contained units.",
			userId: landlordId,
		},
	]);

	if (!maitamaTowers || !ikoyiSuites || !lekkiVilla) {
		throw new Error("Property creation failed");
	}

	console.log("Seeding units…");
	const maitamaUnits = await Unit.create([
		{
			name: "Flat A1",
			rent: 450000,
			propertyId: maitamaTowers._id.toString(),
			userId: landlordId,
			status: "Occupied",
		},
		{
			name: "Flat A2",
			rent: 450000,
			propertyId: maitamaTowers._id.toString(),
			userId: landlordId,
			status: "Occupied",
		},
		{
			name: "Flat B1",
			rent: 450000,
			propertyId: maitamaTowers._id.toString(),
			userId: landlordId,
			status: "Vacant",
			vacantDays: 18,
		},
		{
			name: "Flat B2",
			rent: 450000,
			propertyId: maitamaTowers._id.toString(),
			userId: landlordId,
			status: "Vacant",
			vacantDays: 41,
		},
	]);

	const ikoyiUnits = await Unit.create([
		{
			name: "Suite 1",
			rent: 750000,
			propertyId: ikoyiSuites._id.toString(),
			userId: landlordId,
			status: "Occupied",
		},
		{
			name: "Suite 2",
			rent: 750000,
			propertyId: ikoyiSuites._id.toString(),
			userId: landlordId,
			status: "Occupied",
		},
		{
			name: "Suite 3",
			rent: 750000,
			propertyId: ikoyiSuites._id.toString(),
			userId: landlordId,
			status: "Vacant",
			vacantDays: 7,
		},
	]);

	const lekkiUnits = await Unit.create([
		{
			name: "Ground floor",
			rent: 1200000,
			propertyId: lekkiVilla._id.toString(),
			userId: landlordId,
			status: "Occupied",
		},
		{
			name: "Upper floor",
			rent: 1200000,
			propertyId: lekkiVilla._id.toString(),
			userId: landlordId,
			status: "Vacant",
			vacantDays: 64,
		},
	]);

	console.log("Seeding tenants and linking to units…");
	const occupied: Array<{ unit: any; tenant: any }> = [
		{
			unit: maitamaUnits[0],
			tenant: {
				name: "Ifeanyi Eze",
				email: "ifeanyi@example.com",
				phone: "+2348034501122",
				avatar: "https://i.pravatar.cc/200?img=15",
				moveInDate: daysAgo(240),
				leaseExpiry: daysFromNow(120),
				rentDueDay: 5,
			},
		},
		{
			unit: maitamaUnits[1],
			tenant: {
				name: "Funke Adebola",
				email: "funke@example.com",
				phone: "+2348035667788",
				avatar: "https://i.pravatar.cc/200?img=22",
				moveInDate: daysAgo(150),
				leaseExpiry: daysFromNow(20),
				rentDueDay: 1,
			},
		},
		{
			unit: ikoyiUnits[0],
			tenant: {
				name: "Daniel Bassey",
				email: "daniel@example.com",
				phone: "+2348036700000",
				avatar: "https://i.pravatar.cc/200?img=33",
				moveInDate: daysAgo(400),
				leaseExpiry: daysFromNow(330),
				rentDueDay: 10,
			},
		},
		{
			unit: ikoyiUnits[1],
			tenant: {
				name: "Hauwa Ibrahim",
				email: "hauwa@example.com",
				phone: "+2348037811122",
				avatar: "https://i.pravatar.cc/200?img=51",
				moveInDate: daysAgo(60),
				leaseExpiry: daysFromNow(305),
				rentDueDay: 15,
			},
		},
		{
			unit: lekkiUnits[0],
			tenant: {
				name: "Chiamaka Obi",
				email: "chiamaka@example.com",
				phone: "+2348038922211",
				avatar: "https://i.pravatar.cc/200?img=68",
				moveInDate: daysAgo(95),
				leaseExpiry: daysFromNow(270),
				rentDueDay: 20,
			},
		},
	];

	const tenantDocs: any[] = await Tenant.create(
		occupied.map(({ unit, tenant }) => ({
			...tenant,
			unitId: unit._id.toString(),
			propertyId: unit.propertyId,
			userId: landlordId,
			status: "Active",
		})),
	);

	// Attach tenant subdocs back onto their units + set dueDate/paymentStatus.
	await Promise.all(
		tenantDocs.map(async (tenantDoc, i) => {
			const unit = occupied[i]?.unit;
			const now = new Date();
			const dueDate = new Date(
				now.getFullYear(),
				now.getMonth(),
				tenantDoc.rentDueDay ?? 1,
			);
			const fiveDays = 5 * 24 * 60 * 60 * 1000;
			const paymentStatus =
				now > dueDate
					? "Overdue"
					: dueDate.getTime() - now.getTime() <= fiveDays
						? "Due Soon"
						: "Paid";

			await Unit.findByIdAndUpdate(unit._id, {
				$set: {
					status: "Occupied",
					dueDate,
					paymentStatus,
					tenant: {
						tenantId: tenantDoc._id.toString(),
						name: tenantDoc.name,
						avatar: tenantDoc.avatar ?? undefined,
					},
				},
			});
		}),
	);

	console.log("Seeding transactions…");
	const paymentMethods = [
		"bank-transfer",
		"cash",
		"card",
		"mobile-money",
	] as const;
	const transactions: any[] = [];

	tenantDocs.forEach((tenantDoc, i) => {
		const unit = occupied[i]?.unit;
		for (let m = 0; m < 3; m++) {
			const date = new Date();
			date.setMonth(date.getMonth() - m);
			date.setDate(tenantDoc.rentDueDay ?? 1);
			transactions.push({
				tenantId: tenantDoc._id.toString(),
				userId: landlordId,
				type: "rent",
				description: `Rent for ${date.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
				amount: unit.rent,
				amountType: "credit",
				paymentMethod:
					paymentMethods[m % paymentMethods.length] ??
					"bank-transfer",
				date,
				period: 1,
			});
		}
		transactions.push({
			tenantId: tenantDoc._id.toString(),
			userId: landlordId,
			type: "utilities",
			description: "Generator diesel top-up",
			amount: 25000,
			amountType: "debit",
			paymentMethod: "cash",
			date: daysAgo(7),
		});
	});

	await Transaction.create(transactions);

	console.log("Seeding vendors…");
	const [plumberVendor, electricianVendor, hvacVendor, cleaningVendor] =
		await Vendor.create([
			{
				userId: landlordId,
				name: "Musa Danladi",
				company: "Danladi Plumbing Works",
				specialty: "plumbing",
				phone: "+2348021112233",
				email: "musa@danladiplumbing.ng",
				address: "Garki Area 11, Abuja",
				notes: "Reliable for emergency call-outs. Charges fairly.",
				rating: 4.5,
			},
			{
				userId: landlordId,
				name: "Tunde Bakare",
				company: "Volt Masters Ltd",
				specialty: "electrical",
				phone: "+2348034445566",
				email: "tunde@voltmasters.ng",
				rating: 4,
			},
			{
				userId: landlordId,
				name: "Ngozi Okafor",
				company: "CoolBreeze HVAC",
				specialty: "hvac",
				phone: "+2348097778899",
				email: "ngozi@coolbreeze.ng",
				notes: "Services all AC units at Ikoyi property quarterly.",
				rating: 5,
			},
			{
				userId: landlordId,
				name: "Bright Sweep Services",
				specialty: "cleaning",
				phone: "+2348051234567",
				rating: 3.5,
			},
		]);

	console.log("Seeding maintenance requests…");
	const maintenanceDocs = await MaintenanceRequest.create([
		{
			userId: landlordId,
			propertyId: maitamaTowers._id.toString(),
			unitId: maitamaUnits[0]._id.toString(),
			tenantId: tenantDocs[0]._id.toString(),
			vendorId: plumberVendor._id.toString(),
			title: "Kitchen sink leaking",
			description:
				"Tenant reports persistent leak under the kitchen sink; cabinet base is water-damaged.",
			category: "plumbing",
			priority: "high",
			status: "in-progress",
			scheduledDate: daysFromNow(2),
		},
		{
			userId: landlordId,
			propertyId: ikoyiSuites._id.toString(),
			unitId: ikoyiUnits[0]._id.toString(),
			tenantId: tenantDocs[2]._id.toString(),
			vendorId: hvacVendor._id.toString(),
			title: "AC not cooling in master bedroom",
			description: "Split unit blows warm air; likely needs gas refill.",
			category: "hvac",
			priority: "medium",
			status: "completed",
			cost: 45000,
			scheduledDate: daysAgo(6),
			completedDate: daysAgo(4),
		},
		{
			userId: landlordId,
			propertyId: maitamaTowers._id.toString(),
			title: "Generator servicing overdue",
			description:
				"Quarterly service for the 60kVA generator — oil, filters, belt inspection.",
			category: "appliance",
			priority: "low",
			status: "open",
		},
		{
			userId: landlordId,
			propertyId: lekkiVilla._id.toString(),
			unitId: lekkiUnits[0]._id.toString(),
			tenantId: tenantDocs[4]._id.toString(),
			vendorId: electricianVendor._id.toString(),
			title: "Tripping breaker in living room",
			description:
				"Main living room circuit trips whenever the water heater and AC run together.",
			category: "electrical",
			priority: "urgent",
			status: "open",
		},
		{
			userId: landlordId,
			propertyId: ikoyiSuites._id.toString(),
			title: "Repaint lobby walls",
			description: "Scuffed walls in the entrance lobby need repainting.",
			category: "structural",
			priority: "low",
			status: "on-hold",
		},
		{
			userId: landlordId,
			propertyId: maitamaTowers._id.toString(),
			unitId: maitamaUnits[1]._id.toString(),
			tenantId: tenantDocs[1]._id.toString(),
			vendorId: cleaningVendor._id.toString(),
			title: "Post-fumigation deep clean",
			description: "Deep clean requested after pest fumigation.",
			category: "cleaning",
			priority: "medium",
			status: "cancelled",
		},
	]);

	console.log("Seeding documents…");
	await DocumentModel.create([
		{
			userId: landlordId,
			name: "Lease agreement — Ifeanyi Eze",
			category: "lease",
			propertyId: maitamaTowers._id.toString(),
			unitId: maitamaUnits[0]._id.toString(),
			tenantId: tenantDocs[0]._id.toString(),
			fileKey: "seed/lease-ifeanyi-eze.pdf",
			fileName: "lease-ifeanyi-eze.pdf",
			mimeType: "application/pdf",
			size: 248_320,
		},
		{
			userId: landlordId,
			name: "Insurance policy — Maitama Heights",
			category: "insurance",
			propertyId: maitamaTowers._id.toString(),
			fileKey: "seed/insurance-maitama-2026.pdf",
			fileName: "insurance-maitama-2026.pdf",
			mimeType: "application/pdf",
			size: 1_204_224,
		},
		{
			userId: landlordId,
			name: "AC repair receipt — Suite 1",
			category: "receipt",
			propertyId: ikoyiSuites._id.toString(),
			tenantId: tenantDocs[2]._id.toString(),
			fileKey: "seed/receipt-ac-repair.jpg",
			fileName: "receipt-ac-repair.jpg",
			mimeType: "image/jpeg",
			size: 88_064,
		},
		{
			userId: landlordId,
			name: "Inspection report — Lekki Villa",
			category: "inspection",
			propertyId: lekkiVilla._id.toString(),
			fileKey: "seed/inspection-lekki-q2.pdf",
			fileName: "inspection-lekki-q2.pdf",
			mimeType: "application/pdf",
			size: 512_000,
		},
	]);

	console.log("Seeding notifications…");
	await Notification.create([
		{
			userId: landlordId,
			tenantId: tenantDocs[1]._id.toString(),
			channel: "in-app",
			kind: "rent-due",
			title: "Rent due soon",
			body: `${tenantDocs[1].name}'s rent for Flat A2 is due in 5 days.`,
			status: "sent",
			sentAt: daysAgo(1),
		},
		{
			userId: landlordId,
			tenantId: tenantDocs[0]._id.toString(),
			channel: "in-app",
			kind: "payment-received",
			title: "Payment received",
			body: `${tenantDocs[0].name} paid ₦450,000 rent for Flat A1.`,
			status: "read",
			sentAt: daysAgo(9),
			readAt: daysAgo(8),
		},
		{
			userId: landlordId,
			tenantId: tenantDocs[1].id ?? tenantDocs[1]._id.toString(),
			channel: "in-app",
			kind: "lease-expiry",
			title: "Lease expiring soon",
			body: `${tenantDocs[1].name}'s lease on Flat A2 expires in 20 days.`,
			status: "sent",
			sentAt: daysAgo(2),
		},
		{
			userId: landlordId,
			tenantId: tenantDocs[2]._id.toString(),
			channel: "email",
			kind: "rent-due",
			title: "Rent reminder sent",
			body: `Email reminder delivered to ${tenantDocs[2].name} (daniel@example.com).`,
			to: "daniel@example.com",
			status: "sent",
			sentAt: daysAgo(3),
		},
		{
			userId: landlordId,
			channel: "sms",
			kind: "rent-overdue",
			title: "Overdue rent alert",
			body: "SMS overdue notice failed to deliver — carrier rejected.",
			to: "+2348035667788",
			status: "failed",
			error: "Twilio: unreachable destination handset (30003)",
			sentAt: daysAgo(2),
		},
	]);

	console.log("Seeding audit events…");
	await AuditEvent.create([
		{
			ownerId: landlordId,
			actorId: landlordId,
			action: "create",
			entityType: "property",
			entityId: maitamaTowers._id.toString(),
			description: "Created property Maitama Heights",
			ip: "127.0.0.1",
		},
		{
			ownerId: landlordId,
			actorId: landlordId,
			action: "create",
			entityType: "tenant",
			entityId: tenantDocs[0]._id.toString(),
			description: "Added tenant Ifeanyi Eze to Flat A1",
			ip: "127.0.0.1",
		},
		{
			ownerId: landlordId,
			actorId: landlordId,
			action: "update",
			entityType: "maintenance",
			entityId: maintenanceDocs[1]._id.toString(),
			description: "Marked 'AC not cooling in master bedroom' completed",
			metadata: { cost: 45000 },
			ip: "127.0.0.1",
		},
		{
			ownerId: landlordId,
			actorId: landlordId,
			action: "login",
			entityType: "user",
			entityId: landlordId,
			description: "Signed in with password",
			ip: "127.0.0.1",
		},
		{
			ownerId: landlordId,
			actorId: landlordId,
			action: "delete",
			entityType: "document",
			description: "Deleted expired insurance certificate",
			ip: "127.0.0.1",
		},
	]);

	console.log("Seeding organization…");
	await Organization.create({
		ownerId: landlord._id,
		name: "zakariyya estates",
		description: "Family property portfolio managed jointly.",
		members: [{ memberId: secondary._id, permission: "manager" }],
		invites: [],
	});

	console.log("\n✓ Seed complete.");
	console.log(
		`Inserted: ${tenantDocs.length} tenants, ${transactions.length} transactions, ` +
			`4 vendors, ${maintenanceDocs.length} maintenance requests, 4 documents, ` +
			`5 notifications, 5 audit events, 1 organization`,
	);
	console.log("\nDemo accounts (password: password123):");
	console.log("  • Landlord  — abdullah@example.com");
	console.log("  • Landlord  — amina@example.com");

	await disconnectMongoDB();
	await mongoose.disconnect();
}

run()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
