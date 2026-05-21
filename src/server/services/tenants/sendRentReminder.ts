import mongoose from "mongoose";
import { ErrTenantNotFound } from "../../constants";
import { getTenantByIdDB } from "../../models";
import { sendNotification } from "../notifications";
import { getUserById } from "../users";

interface RemindArgs {
	tenantId: string;
	userId: string; // owner whose tenant this is
	kind?: "rent-due" | "rent-overdue";
}

export default async function sendRentReminder({
	tenantId,
	userId,
	kind = "rent-due",
}: RemindArgs) {
	const tenant = await getTenantByIdDB({ id: tenantId, userId });
	if (!tenant) throw ErrTenantNotFound;
	const owner = await getUserById({ id: userId });
	if (!owner) throw ErrTenantNotFound;

	const channels: ("email" | "sms" | "whatsapp" | "in-app")[] = [];
	if (owner.notifications?.emailEnabled !== false && tenant.email)
		channels.push("email");
	if (owner.notifications?.smsEnabled && tenant.phone) channels.push("sms");
	if (channels.length === 0) channels.push("in-app");

	const title =
		kind === "rent-overdue"
			? "Reminder: rent payment overdue"
			: "Reminder: rent payment due";
	const body =
		kind === "rent-overdue"
			? `Hi ${tenant.name}, your rent payment is overdue. Please settle as soon as possible.`
			: `Hi ${tenant.name}, this is a friendly reminder about your upcoming rent payment.`;

	const Unit = mongoose.models.units;
	const unit = Unit
		? await Unit.findById(new mongoose.Types.ObjectId(tenant.unitId)).lean()
		: null;

	const result = await sendNotification({
		userId,
		tenantId,
		channels,
		kind,
		title,
		body,
		to: tenant.email ?? tenant.phone ?? "",
		meta: {
			tenantName: tenant.name,
			unitName: (unit as { name?: string } | null)?.name ?? "",
		},
	});

	return {
		...result,
		tenant: {
			id: (
				tenant as unknown as { _id: { toString(): string } }
			)._id?.toString(),
			name: tenant.name,
		},
	};
}
