import type { IJwtPayload } from "../../types";

export interface IUserPreferences {
	currency: string;
	dateFormat: string;
	language: string;
	timezone: string;
	theme: string;
}

export interface IUserNotificationSettings {
	emailEnabled: boolean;
	smsEnabled: boolean;
	pushEnabled: boolean;
	paymentReceived: boolean;
	paymentOverdue: boolean;
	tenantMoveIn: boolean;
	tenantMoveOut: boolean;
	leaseExpiry: boolean;
}

export interface IUserReminderSettings {
	rentDueLeadDays: number; // remind N days before rent-due
	overdueRepeatDays: number; // re-remind every N days while overdue
	autoSendOnDueDay: boolean;
	autoSendForOverdue: boolean;
	leaseExpiryLeadDays: number;
}

export interface IUserSecurity {
	twoFactorEnabled: boolean;
	totpSecret?: string;
	pendingTotpSecret?: string;
	recoveryCodes?: string[];
	emailVerified: boolean;
	emailVerificationToken?: string;
	emailVerificationExpires?: Date;
	passwordResetToken?: string;
	passwordResetExpires?: Date;
}

export interface IUserCreateInput {
	username: string;
	email: string;
	password?: string;
	name: string;
	avatar?: string;
	phone?: string;
	preferences?: IUserPreferences;
	notifications?: IUserNotificationSettings;
	reminders?: IUserReminderSettings;
	security?: IUserSecurity;
	currentOrganizationId?: string;
}

export interface IUser extends IUserCreateInput {
	_id: string;
	createdAt: Date;
	updatedAt: Date;
	deleted: boolean;
	refreshTokens?: {
		refreshToken: string;
		deadline: Date;
	}[];
	preferences: IUserPreferences;
	notifications: IUserNotificationSettings;
	reminders: IUserReminderSettings;
	security: IUserSecurity;
}

export interface IUserMethods extends IUser {
	generateAuthToken(ip?: string): Promise<IJwtPayload>;
	hashPassword(password: string): Promise<string | null>;
}

export const DEFAULT_USER_PREFERENCES: IUserPreferences = {
	currency: "NGN",
	dateFormat: "DD/MM/YYYY",
	language: "en",
	timezone: "WAT",
	theme: "system",
};

export const DEFAULT_USER_NOTIFICATIONS: IUserNotificationSettings = {
	emailEnabled: true,
	smsEnabled: false,
	pushEnabled: false,
	paymentReceived: true,
	paymentOverdue: true,
	tenantMoveIn: true,
	tenantMoveOut: true,
	leaseExpiry: true,
};

export const DEFAULT_USER_REMINDERS: IUserReminderSettings = {
	rentDueLeadDays: 3,
	overdueRepeatDays: 7,
	autoSendOnDueDay: true,
	autoSendForOverdue: true,
	leaseExpiryLeadDays: 14,
};

export const DEFAULT_USER_SECURITY: IUserSecurity = {
	twoFactorEnabled: false,
	emailVerified: false,
};
