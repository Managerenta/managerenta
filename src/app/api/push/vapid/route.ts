import { handleError, ok, withApiHandler, withAuth } from "@/server/lib";
import { getVapidPublicKey } from "@/server/services";

export const runtime = "nodejs";

export const GET = withApiHandler(
	{ route: "/api/push/vapid" },
	withAuth(async () => {
		try {
			return ok({ publicKey: getVapidPublicKey() });
		} catch (error) {
			return handleError(error);
		}
	}),
);
