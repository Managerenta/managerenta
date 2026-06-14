import mongoose from "mongoose";
import type { IMaintenanceCategory } from "../../models/maintenance/types";
import { createMaintenance } from "../maintenance";

function oid(id: string): mongoose.Types.ObjectId | null {
	try {
		return new mongoose.Types.ObjectId(id);
	} catch {
		return null;
	}
}

export interface IPortalTransaction {
	id: string;
	date: string;
	type: string;
	description: string;
	amount: number;
	amountType: "credit" | "debit";
	paymentMethod?: string;
}

export interface IPortalSummary {
	tenant: {
		id: string;
		name: string;
		email?: string;
		phone?: string;
		moveInDate?: string;
		leaseExpiry?: string;
		rentDueDay: number;
	};
	property: { id: string; name: string; address?: string } | null;
	unit: { id: string; name: string; rent: number } | null;
	balance: { outstanding: number; totalPaid: number; monthlyRent: number };
	transactions: IPortalTransaction[];
}

/**
 * Read-model for the tenant self-service portal. Scoped strictly to one tenant
 * within one owner — both come from the verified portal token, never the
 * client.
 */
export async function getPortalSummary({
	tenantId,
	ownerId,
}: {
	tenantId: string;
	ownerId: string;
}): Promise<IPortalSummary | null> {
	const Tenant = mongoose.models.tenants;
	const Unit = mongoose.models.units;
	const Property = mongoose.models.properties;
	const Transaction = mongoose.models.transactions;
	if (!Tenant) return null;

	const tid = oid(tenantId);
	if (!tid) return null;

	const tenant = (await Tenant.findOne({
		_id: tid,
		userId: ownerId,
		deleted: false,
	}).lean()) as any;
	if (!tenant) return null;

	const [unitDoc, propertyDoc, txs] = await Promise.all([
		Unit && tenant.unitId
			? Unit.findOne({ _id: oid(tenant.unitId) }).lean()
			: null,
		Property && tenant.propertyId
			? Property.findOne({ _id: oid(tenant.propertyId) }).lean()
			: null,
		Transaction
			? Transaction.find({ tenantId, userId: ownerId, deleted: false })
					.sort({ date: -1 })
					.limit(50)
					.lean()
			: [],
	]);

	const unit = unitDoc as any;
	const property = propertyDoc as any;
	const monthlyRent: number = unit?.rent ?? 0;

	const transactions: IPortalTransaction[] = (txs as any[]).map((t) => ({
		id: t._id.toString(),
		date: new Date(t.date).toISOString(),
		type: t.type,
		description: t.description ?? "",
		amount: t.amount ?? 0,
		amountType: t.amountType,
		paymentMethod: t.paymentMethod,
	}));

	const rentCredits = (txs as any[]).filter(
		(t) => t.type === "rent" && t.amountType === "credit",
	);
	const totalPaid = rentCredits.reduce((a, t) => a + (t.amount ?? 0), 0);

	let outstanding = 0;
	if (tenant.moveInDate && monthlyRent > 0) {
		const moveIn = new Date(tenant.moveInDate);
		const now = new Date();
		const monthsElapsed =
			(now.getFullYear() - moveIn.getFullYear()) * 12 +
			(now.getMonth() - moveIn.getMonth()) +
			1;
		outstanding = Math.max(
			0,
			Math.max(0, monthsElapsed) * monthlyRent - totalPaid,
		);
	}

	return {
		tenant: {
			id: tenant._id.toString(),
			name: tenant.name,
			email: tenant.email,
			phone: tenant.phone,
			moveInDate: tenant.moveInDate
				? new Date(tenant.moveInDate).toISOString()
				: undefined,
			leaseExpiry: tenant.leaseExpiry
				? new Date(tenant.leaseExpiry).toISOString()
				: undefined,
			rentDueDay: tenant.rentDueDay ?? 1,
		},
		property: property
			? {
					id: property._id.toString(),
					name: property.name,
					address: property.address,
				}
			: null,
		unit: unit
			? { id: unit._id.toString(), name: unit.name, rent: monthlyRent }
			: null,
		balance: { outstanding, totalPaid, monthlyRent },
		transactions,
	};
}

/**
 * Tenant submits a maintenance request from the portal. Property/unit are taken
 * from the tenant record so a tenant can only file against their own home.
 */
export async function submitPortalMaintenance({
	tenantId,
	ownerId,
	title,
	description,
	category,
}: {
	tenantId: string;
	ownerId: string;
	title: string;
	description: string;
	category: IMaintenanceCategory;
}) {
	const Tenant = mongoose.models.tenants;
	if (!Tenant) return null;
	const tid = oid(tenantId);
	if (!tid) return null;

	const tenant = (await Tenant.findOne({
		_id: tid,
		userId: ownerId,
		deleted: false,
	}).lean()) as any;
	if (!tenant) return null;

	return createMaintenance({
		userId: ownerId,
		propertyId: tenant.propertyId,
		unitId: tenant.unitId || undefined,
		tenantId,
		title,
		description,
		category,
	});
}
