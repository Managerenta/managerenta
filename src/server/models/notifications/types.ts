import type mongoose from "mongoose";

export type INotificationChannel = "email" | "sms" | "whatsapp" | "in-app";
export type INotificationStatus = "queued" | "sent" | "failed" | "read";
export type INotificationKind =
	| "rent-due"
	| "rent-overdue"
	| "payment-received"
	| "lease-expiry"
	| "tenant-move-in"
	| "tenant-move-out"
	| "org-invite"
	| "email-verification"
	| "password-reset"
	| "system";

export interface INotificationCreateInput {
	userId: string;
	tenantId?: string;
	organizationId?: string;
	channel: INotificationChannel;
	kind: INotificationKind;
	title: string;
	body: string;
	to?: string;
	meta?: Record<string, unknown>;
}

export interface INotification extends INotificationCreateInput {
	_id: mongoose.Types.ObjectId;
	status: INotificationStatus;
	createdAt: Date;
	updatedAt: Date;
	sentAt?: Date;
	readAt?: Date;
	error?: string;
}
