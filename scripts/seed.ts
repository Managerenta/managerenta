/* biome-ignore-all lint/suspicious/noExplicitAny: seed script intentionally loose on schema types */
import mongoose from "mongoose";
import { connectMongoDB, disconnectMongoDB } from "../src/server/databases";
import {
	Organization as _Organization,
	Property as _Property,
	Tenant as _Tenant,
	Unit as _Unit,
	User as _User,
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

async function clean() {
	await Promise.all([
		User.deleteMany({}),
		Property.deleteMany({}),
		Unit.deleteMany({}),
		Tenant.deleteMany({}),
		Transaction.deleteMany({}),
		Organization.deleteMany({}),
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

	console.log("\n✓ Seed complete.");
	console.log(
		`Inserted: ${tenantDocs.length} tenants, ${transactions.length} transactions`,
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
