// Domain-event notifications. Thin best-effort helpers that translate a
// business event (a payment landed, a tenant moved in, a lease is about to
// expire) into a `sendNotification` dispatch. They never throw so the calling
// domain service is not coupled to delivery success.

import type {
	INotificationChannel,
	INotificationKind,
} from "../../models/notifications/types";
import {
	DEFAULT_USER_NOTIFICATIONS,
	type IUserNotificationSettings,
} from "../../models/users/types";
import { getUserById } from "../users";
import { sendNotification } from "./dispatch";

interface OwnerResolved {
	id: string;
	email?: string;
	phone?: string;
	notifications: IUserNotificationSettings;
}

async function resolveOwner(userId: string): Promise<OwnerResolved | null> {
	try {
		const owner = await getUserById({ id: userId });
		if (!owner) return null;
		return {
			id: userId,
			email: owner.email,
			phone: owner.phone,
			notifications: {
				...DEFAULT_USER_NOTIFICATIONS,
				...(owner.notifications ?? {}),
			},
		};
	} catch {
		return null;
	}
}

function resolveChannels(
	owner: OwnerResolved,
	{ emailFallback }: { emailFallback: boolean },
): INotificationChannel[] {
	const channels: INotificationChannel[] = ["in-app"];
	if (emailFallback && owner.notifications.emailEnabled && owner.email) {
		channels.push("email");
	}
	if (owner.notifications.smsEnabled && owner.phone) channels.push("sms");
	return channels;
}

async function safeDispatch(args: Parameters<typeof sendNotification>[0]) {
	try {
		await sendNotification(args);
	} catch (error) {
		console.warn("[notifications:event] dispatch failed", {
			kind: args.kind,
			userId: args.userId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

function fmtMoney(amount: number, currency = "NGN"): string {
	try {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency,
			maximumFractionDigits: 0,
		}).format(amount);
	} catch {
		return `${currency} ${amount.toLocaleString()}`;
	}
}

export interface NotifyPaymentReceivedArgs {
	userId: string;
	tenantId: string;
	tenantName: string;
	unitName?: string;
	amount: number;
	currency?: string;
	paymentMethod?: string;
}

export async function notifyPaymentReceived(args: NotifyPaymentReceivedArgs) {
	const owner = await resolveOwner(args.userId);
	if (!owner?.notifications.paymentReceived) return;
	const channels = resolveChannels(owner, { emailFallback: false });
	const where = args.unitName ? ` for ${args.unitName}` : "";
	await safeDispatch({
		userId: args.userId,
		tenantId: args.tenantId,
		channels,
		kind: "payment-received" satisfies INotificationKind,
		title: "Payment received",
		body: `${args.tenantName} paid ${fmtMoney(args.amount, args.currency)}${where}.`,
		to: owner.email,
		meta: {
			tenantId: args.tenantId,
			tenantName: args.tenantName,
			amount: args.amount,
			currency: args.currency ?? "NGN",
			paymentMethod: args.paymentMethod,
		},
	});
}

export interface NotifyTenantMoveInArgs {
	userId: string;
	tenantId: string;
	tenantName: string;
	unitName?: string;
}

export async function notifyTenantMoveIn(args: NotifyTenantMoveInArgs) {
	const owner = await resolveOwner(args.userId);
	if (!owner?.notifications.tenantMoveIn) return;
	const channels = resolveChannels(owner, { emailFallback: false });
	const where = args.unitName ? ` into ${args.unitName}` : "";
	await safeDispatch({
		userId: args.userId,
		tenantId: args.tenantId,
		channels,
		kind: "tenant-move-in" satisfies INotificationKind,
		title: "New tenant added",
		body: `${args.tenantName} has been added${where}.`,
		to: owner.email,
		meta: {
			tenantId: args.tenantId,
			tenantName: args.tenantName,
			unitName: args.unitName,
		},
	});
}

export interface NotifyTenantMoveOutArgs {
	userId: string;
	tenantId: string;
	tenantName: string;
	unitName?: string;
}

export async function notifyTenantMoveOut(args: NotifyTenantMoveOutArgs) {
	const owner = await resolveOwner(args.userId);
	if (!owner?.notifications.tenantMoveOut) return;
	const channels = resolveChannels(owner, { emailFallback: false });
	const where = args.unitName ? ` from ${args.unitName}` : "";
	await safeDispatch({
		userId: args.userId,
		tenantId: args.tenantId,
		channels,
		kind: "tenant-move-out" satisfies INotificationKind,
		title: "Tenant removed",
		body: `${args.tenantName} has moved out${where}.`,
		to: owner.email,
		meta: {
			tenantId: args.tenantId,
			tenantName: args.tenantName,
			unitName: args.unitName,
		},
	});
}

export interface NotifyLeaseExpiringArgs {
	userId: string;
	tenantId: string;
	tenantName: string;
	unitName?: string;
	daysLeft: number;
	leaseExpiry: Date;
}

export async function notifyLeaseExpiring(args: NotifyLeaseExpiringArgs) {
	const owner = await resolveOwner(args.userId);
	if (!owner?.notifications.leaseExpiry) return;
	const channels = resolveChannels(owner, { emailFallback: true });
	const where = args.unitName ? ` (${args.unitName})` : "";
	const horizon =
		args.daysLeft <= 0
			? "today"
			: args.daysLeft === 1
				? "tomorrow"
				: `in ${args.daysLeft} days`;
	await safeDispatch({
		userId: args.userId,
		tenantId: args.tenantId,
		channels,
		kind: "lease-expiry" satisfies INotificationKind,
		title: "Lease expiring soon",
		body: `${args.tenantName}'s lease${where} expires ${horizon}.`,
		to: owner.email,
		meta: {
			tenantId: args.tenantId,
			tenantName: args.tenantName,
			unitName: args.unitName,
			daysLeft: args.daysLeft,
			leaseExpiry: args.leaseExpiry.toISOString(),
		},
	});
}
