import { ErrInvalidFields } from "@/server/constants";
import {
	created,
	handleError,
	ok,
	withApiHandler,
	withAuth,
} from "@/server/lib";
import { removeSubscription, saveSubscription } from "@/server/services";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{ route: "/api/push/subscribe" },
	withAuth(async ({ req, auth }) => {
		try {
			let raw: {
				subscription?: {
					endpoint: string;
					keys: { p256dh: string; auth: string };
				};
			};
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			if (!raw.subscription?.endpoint || !raw.subscription.keys?.p256dh) {
				throw ErrInvalidFields;
			}

			const okSaved = await saveSubscription({
				userId: auth.userId,
				subscription: raw.subscription,
				userAgent: req.headers.get("user-agent") ?? undefined,
			});
			if (!okSaved) throw ErrInvalidFields;
			return created({ subscribed: true }, "Subscribed to push");
		} catch (error) {
			return handleError(error);
		}
	}),
);

export const DELETE = withApiHandler(
	{ route: "/api/push/subscribe" },
	withAuth(async ({ req, auth }) => {
		try {
			let raw: { endpoint?: string };
			try {
				raw = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			if (!raw.endpoint) throw ErrInvalidFields;
			await removeSubscription({
				userId: auth.userId,
				endpoint: raw.endpoint,
			});
			return ok({ subscribed: false }, "Unsubscribed from push");
		} catch (error) {
			return handleError(error);
		}
	}),
);
