import mongoose from "mongoose";
import { User } from "../../models/users";
import sendRentReminder from "../tenants/sendRentReminder";

/**
 * Sweeps every active landlord's tenants and dispatches due/overdue reminders
 * matching the landlord's user.reminders.* configuration.
 */
export default async function dailyRemindersJob(): Promise<{
	usersScanned: number;
	remindersSent: number;
}> {
	const Tenant = mongoose.models.tenants;
	const Unit = mongoose.models.units;
	const Transaction = mongoose.models.transactions;
	if (!Tenant || !Unit || !Transaction) {
		return { usersScanned: 0, remindersSent: 0 };
	}

	const now = new Date();
	const today = now.getDate();
	const year = now.getFullYear();
	const month = now.getMonth();
	let remindersSent = 0;

	const users = await User.find({ deleted: false }).lean();
	for (const user of users) {
		const reminders = (
			user as {
				reminders?: {
					autoSendOnDueDay?: boolean;
					autoSendForOverdue?: boolean;
					rentDueLeadDays?: number;
					overdueRepeatDays?: number;
				};
			}
		).reminders;
		if (!reminders) continue;

		const tenants = await Tenant.find({
			userId: user._id.toString(),
			deleted: false,
			status: "Active",
		}).lean();

		for (const tenant of tenants as Array<{
			_id: mongoose.Types.ObjectId;
			rentDueDay?: number;
			unitId: string;
		}>) {
			const due = tenant.rentDueDay ?? 1;
			const dueDate = new Date(year, month, due);
			const diffDays = Math.floor(
				(dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
			);

			// Lead-time reminder
			if (
				reminders.autoSendOnDueDay !== false &&
				diffDays >= 0 &&
				diffDays === (reminders.rentDueLeadDays ?? 3)
			) {
				try {
					await sendRentReminder({
						tenantId: tenant._id.toString(),
						userId: user._id.toString(),
						kind: "rent-due",
					});
					remindersSent++;
				} catch {
					// keep going
				}
				continue;
			}

			// Overdue reminder
			if (reminders.autoSendForOverdue !== false && today > due) {
				const daysOverdue = Math.floor(
					(now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
				);
				const repeat = reminders.overdueRepeatDays ?? 7;
				if (daysOverdue > 0 && daysOverdue % repeat === 0) {
					// Check this month is uncovered before reminding
					const credit = await Transaction.findOne({
						tenantId: tenant._id.toString(),
						type: "rent",
						amountType: "credit",
						$or: [
							{
								periodStart: { $lte: dueDate },
								periodEnd: { $gte: dueDate },
							},
							{
								date: {
									$gte: new Date(year, month, 1),
									$lte: new Date(year, month + 1, 0),
								},
							},
						],
					}).lean();
					if (!credit) {
						try {
							await sendRentReminder({
								tenantId: tenant._id.toString(),
								userId: user._id.toString(),
								kind: "rent-overdue",
							});
							remindersSent++;
						} catch {
							// continue
						}
					}
				}
			}
		}
	}

	return { usersScanned: users.length, remindersSent };
}
