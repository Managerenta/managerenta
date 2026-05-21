import mongoose from "mongoose";
import { ErrUserNotFound } from "@/server/constants";
import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getUserById } from "@/server/services";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/users/data-export" },
	withAuth(async ({ auth }) => {
		try {
			const user = await getUserById({
				id: auth.userId,
				refreshCache: true,
			});
			if (!user) throw ErrUserNotFound;

			const Property = mongoose.models.properties;
			const Tenant = mongoose.models.tenants;
			const Unit = mongoose.models.units;
			const Transaction = mongoose.models.transactions;
			const Notification = mongoose.models.notifications;

			const [properties, tenants, units, transactions, notifications] =
				await Promise.all([
					Property?.find({
						userId: auth.userId,
						deleted: false,
					}).lean() ?? [],
					Tenant?.find({
						userId: auth.userId,
						deleted: false,
					}).lean() ?? [],
					Unit?.find({
						userId: auth.userId,
						deleted: false,
					}).lean() ?? [],
					Transaction?.find({ userId: auth.userId }).lean() ?? [],
					Notification?.find({ userId: auth.userId })
						.limit(500)
						.sort({ createdAt: -1 })
						.lean() ?? [],
				]);

			return ok({
				exportedAt: new Date().toISOString(),
				user: {
					id: user._id,
					username: user.username,
					email: user.email,
					name: user.name,
					phone: user.phone,
					createdAt: user.createdAt,
					preferences: user.preferences,
					notifications: user.notifications,
					reminders: user.reminders,
					security: user.security
						? {
								twoFactorEnabled:
									user.security.twoFactorEnabled,
								emailVerified: user.security.emailVerified,
							}
						: null,
				},
				properties,
				units,
				tenants,
				transactions,
				notificationsLog: notifications,
			});
		} catch (error) {
			return handleError(error);
		}
	}),
);
