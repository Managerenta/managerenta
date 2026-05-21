import { hash } from "bcrypt";
import mongoose, { type ClientSession, type Model } from "mongoose";
import { isEmail } from "validator";
import {
	ErrInvalidAction,
	ErrInvalidEmail,
	ErrUserNotFound,
	MAX_LIMIT,
} from "../../constants";
import { s3GetFileLink } from "../../helpers";
import { databaseResponseTimeHistogram } from "../../metrics";
import type { IJwtPayload } from "../../types";
import { IOperationType } from "../utils";
import {
	DEFAULT_USER_NOTIFICATIONS,
	DEFAULT_USER_PREFERENCES,
	DEFAULT_USER_REMINDERS,
	DEFAULT_USER_SECURITY,
	type IUser,
	type IUserCreateInput,
	type IUserMethods,
} from "./types";
import { generateAuthToken } from "./utils";

export const collectionName = "users";

export type UserModel = Model<IUser, object, IUserMethods>;

const schema = new mongoose.Schema<IUser, UserModel, IUserMethods>(
	{
		username: {
			type: String,
			required: true,
			unique: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			validate(value: string) {
				if (!isEmail(value)) {
					throw ErrInvalidEmail;
				}
			},
		},
		password: {
			type: String,
			required: true,
			minlength: 6,
			maxlength: 128,
			select: false,
		},
		name: {
			type: String,
			required: true,
		},
		avatar: {
			type: String,
			required: false,
		},
		phone: {
			type: String,
			required: false,
		},
		deleted: {
			type: Boolean,
			default: false,
			select: false,
		},
		refreshTokens: [
			{
				refreshToken: {
					type: String,
					required: true,
				},
				deadline: {
					type: Date,
					required: true,
				},
			},
		],
		preferences: {
			currency: {
				type: String,
				default: DEFAULT_USER_PREFERENCES.currency,
			},
			dateFormat: {
				type: String,
				default: DEFAULT_USER_PREFERENCES.dateFormat,
			},
			language: {
				type: String,
				default: DEFAULT_USER_PREFERENCES.language,
			},
			timezone: {
				type: String,
				default: DEFAULT_USER_PREFERENCES.timezone,
			},
			theme: { type: String, default: DEFAULT_USER_PREFERENCES.theme },
		},
		notifications: {
			emailEnabled: {
				type: Boolean,
				default: DEFAULT_USER_NOTIFICATIONS.emailEnabled,
			},
			smsEnabled: {
				type: Boolean,
				default: DEFAULT_USER_NOTIFICATIONS.smsEnabled,
			},
			pushEnabled: {
				type: Boolean,
				default: DEFAULT_USER_NOTIFICATIONS.pushEnabled,
			},
			paymentReceived: {
				type: Boolean,
				default: DEFAULT_USER_NOTIFICATIONS.paymentReceived,
			},
			paymentOverdue: {
				type: Boolean,
				default: DEFAULT_USER_NOTIFICATIONS.paymentOverdue,
			},
			tenantMoveIn: {
				type: Boolean,
				default: DEFAULT_USER_NOTIFICATIONS.tenantMoveIn,
			},
			tenantMoveOut: {
				type: Boolean,
				default: DEFAULT_USER_NOTIFICATIONS.tenantMoveOut,
			},
			leaseExpiry: {
				type: Boolean,
				default: DEFAULT_USER_NOTIFICATIONS.leaseExpiry,
			},
		},
		reminders: {
			rentDueLeadDays: {
				type: Number,
				default: DEFAULT_USER_REMINDERS.rentDueLeadDays,
			},
			overdueRepeatDays: {
				type: Number,
				default: DEFAULT_USER_REMINDERS.overdueRepeatDays,
			},
			autoSendOnDueDay: {
				type: Boolean,
				default: DEFAULT_USER_REMINDERS.autoSendOnDueDay,
			},
			autoSendForOverdue: {
				type: Boolean,
				default: DEFAULT_USER_REMINDERS.autoSendForOverdue,
			},
			leaseExpiryLeadDays: {
				type: Number,
				default: DEFAULT_USER_REMINDERS.leaseExpiryLeadDays,
			},
		},
		security: {
			twoFactorEnabled: {
				type: Boolean,
				default: DEFAULT_USER_SECURITY.twoFactorEnabled,
			},
			totpSecret: { type: String, select: false },
			pendingTotpSecret: { type: String, select: false },
			recoveryCodes: { type: [String], select: false, default: [] },
			emailVerified: {
				type: Boolean,
				default: DEFAULT_USER_SECURITY.emailVerified,
			},
			emailVerificationToken: { type: String, select: false },
			emailVerificationExpires: { type: Date, select: false },
			passwordResetToken: { type: String, select: false },
			passwordResetExpires: { type: Date, select: false },
		},
		currentOrganizationId: { type: String, required: false },
	},
	{ timestamps: true },
);

schema.index({ username: 1, email: 1 });
schema.index({ "refreshTokens.deadline": 1 });

schema.pre("save", async function () {
	if (this.password && this.isModified("password")) {
		this.password = await hash(this.password, 12);
	}
});

schema.pre("findOneAndUpdate", async function () {
	const update = this.getUpdate() as any;
	if (update?.$set?.password) {
		update.$set.password = await hash(update.$set.password, 12);
	} else if (update?.password) {
		update.password = await hash(update.password, 12);
	}
});

schema.pre("aggregate", function () {
	this.pipeline().unshift({ $match: { deleted: false } });
	this.pipeline().push({ $addFields: { id: { $toString: "$_id" } } });
	this.pipeline().push({
		$project: {
			password: 0,
			refreshTokens: 0,
			__v: 0,
			deleted: 0,
			"security.totpSecret": 0,
			"security.pendingTotpSecret": 0,
			"security.recoveryCodes": 0,
			"security.emailVerificationToken": 0,
			"security.emailVerificationExpires": 0,
			"security.passwordResetToken": 0,
			"security.passwordResetExpires": 0,
		},
	});
});

schema.post("aggregate", async (documents: IUser[]) => {
	const expiresIn = 60 * 60 * 24;
	await Promise.allSettled(
		documents.map(async (doc) => {
			if (!doc.avatar) return;
			doc.avatar =
				(await s3GetFileLink({
					fileName: doc.avatar,
					expiresInSeconds: expiresIn,
				})) ?? doc.avatar;
		}),
	);
});

schema.methods.generateAuthToken = async function (
	ip?: string,
): Promise<IJwtPayload> {
	const result = await generateAuthToken({
		userId: this._id.toString(),
		ip: ip || "",
		shouldRegenerateRefreshToken: true,
	});
	if (!result) throw ErrInvalidAction;

	const MAX_REFRESH_TOKENS = 10;
	const existing = this?.refreshTokens ?? [];
	const trimmed =
		existing.length >= MAX_REFRESH_TOKENS
			? existing.slice(existing.length - MAX_REFRESH_TOKENS + 1)
			: existing;
	const refreshTokens = [
		...trimmed,
		{
			refreshToken: result.refreshToken,
			deadline: result.refreshTokenExpiresIn,
		},
	];

	this.refreshTokens = refreshTokens;

	await this.save();

	return result;
};

schema.methods.hashPassword = async (value: string): Promise<string | null> => {
	try {
		return await hash(value, 12);
	} catch {
		return null;
	}
};

export const User: UserModel =
	(mongoose.models[collectionName] as UserModel | undefined) ??
	mongoose.model<IUser, UserModel>(collectionName, schema);

export async function createUserDB({
	payload,
	session,
}: {
	payload: IUserCreateInput;
	session?: ClientSession;
}): Promise<IUser | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await new User(payload).save({ session });
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createUserDB",
			success: "true",
		});

		return result;
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createUserDB",
			success: "false",
		});
		return null;
	}
}

export async function updateUserDB({
	id,
	payload,
	session,
}: {
	id: string;
	payload: Partial<IUserCreateInput>;
	session?: ClientSession;
}): Promise<IUser | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await User.findByIdAndUpdate(
			new mongoose.Types.ObjectId(id),
			payload,
			{
				session,
			},
		);

		if (!result) throw ErrUserNotFound;

		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateUserDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateUserDB",
			success: "false",
		});
		return null;
	}
}

export async function updateUserRawDB({
	id,
	update,
	session,
}: {
	id: string;
	update: Record<string, unknown>;
	session?: ClientSession;
}): Promise<IUser | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await User.findByIdAndUpdate(
			new mongoose.Types.ObjectId(id),
			update,
			{ session, new: true },
		);
		if (!result) throw ErrUserNotFound;
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateUserRawDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "updateUserRawDB",
			success: "false",
		});
		return null;
	}
}

export async function findUserBySecurityTokenDB({
	field,
	token,
	session,
}: {
	field: "passwordResetToken" | "emailVerificationToken";
	token: string;
	session?: ClientSession;
}): Promise<IUser | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await User.findOne(
			{
				[`security.${field}`]: token,
				deleted: false,
			},
			null,
			{ session },
		).select(
			`+security.${field} +security.passwordResetExpires +security.emailVerificationExpires +security.totpSecret +security.pendingTotpSecret`,
		);
		if (!result) return null;
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "findUserBySecurityTokenDB",
			success: "true",
		});
		return result as unknown as IUser;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "findUserBySecurityTokenDB",
			success: "false",
		});
		return null;
	}
}

export async function getUserSecretsDB({
	id,
	session,
}: {
	id: string;
	session?: ClientSession;
}): Promise<{
	totpSecret?: string;
	pendingTotpSecret?: string;
	recoveryCodes?: string[];
} | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await User.findById(
			new mongoose.Types.ObjectId(id),
			null,
			{ session },
		).select(
			"+security.totpSecret +security.pendingTotpSecret +security.recoveryCodes",
		);
		if (!result) return null;
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUserSecretsDB",
			success: "true",
		});
		const sec = (result as unknown as IUser).security;
		return {
			totpSecret: sec?.totpSecret,
			pendingTotpSecret: sec?.pendingTotpSecret,
			recoveryCodes: sec?.recoveryCodes,
		};
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUserSecretsDB",
			success: "false",
		});
		return null;
	}
}

export async function changePasswordDB({
	id,
	password,
	session,
}: {
	id: string;
	password: string;
	session?: ClientSession;
}): Promise<boolean> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await User.findByIdAndUpdate(
			new mongoose.Types.ObjectId(id),
			{ password },
			{ session },
		);
		if (!result) throw ErrUserNotFound;
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "changePasswordDB",
			success: "true",
		});
		return true;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "changePasswordDB",
			success: "false",
		});
		return false;
	}
}

export async function deleteUserDB({
	id,
	session,
}: {
	id: string;
	session?: ClientSession;
}): Promise<IUser | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await User.findByIdAndUpdate(
			new mongoose.Types.ObjectId(id),
			{ deleted: true },
			{ session },
		);

		if (!result) throw ErrUserNotFound;

		timer({
			operation: IOperationType.Delete,
			collection: collectionName,
			method: "deleteUserDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Delete,
			collection: collectionName,
			method: "deleteUserDB",
			success: "false",
		});
		return null;
	}
}

export async function loginUserDB({
	id,
	ip,
	session,
}: {
	id: string;
	ip?: string;
	session?: ClientSession;
}): Promise<IJwtPayload | null> {
	const timer = databaseResponseTimeHistogram.startTimer();

	try {
		const result = await (
			await User.findById(new mongoose.Types.ObjectId(id), null, {
				session,
			})
		)?.generateAuthToken(ip);

		if (!result) throw ErrInvalidAction;

		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "loginUserDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "loginUserDB",
			success: "false",
		});
		return null;
	}
}

export async function logoutUserDB({
	id,
	refreshToken,
	session,
}: {
	id: string;
	refreshToken: string;
	session?: ClientSession;
}): Promise<boolean> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await User.findByIdAndUpdate(
			new mongoose.Types.ObjectId(id),
			{
				$pull: { refreshTokens: { refreshToken } },
			},
			{
				returnDocument: "after",
				projection: { refreshTokens: 0 },
				session,
			},
		);
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "logoutUserDB",
			success: "true",
		});
		return !!result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "logoutUserDB",
			success: "false",
		});
		return false;
	}
}

export async function reLoginUserWithRefreshTokenDB({
	id,
	refreshToken,
	ip,
	session,
}: {
	id: string;
	refreshToken: string;
	ip: string;
	session?: ClientSession;
}): Promise<IJwtPayload | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const user = await User.findById(
			new mongoose.Types.ObjectId(id),
			null,
			{
				session,
			},
		);

		if (!user || user.deleted) throw ErrUserNotFound;

		const now = new Date();
		const hasValidToken = (user.refreshTokens ?? []).some(
			(rt) => rt.refreshToken === refreshToken && rt.deadline > now,
		);
		if (!hasValidToken) throw ErrUserNotFound;

		const result = await user.generateAuthToken(ip);

		user.refreshTokens = (user.refreshTokens ?? []).filter(
			(rt) => rt.refreshToken !== refreshToken,
		);
		await user.save({ session });

		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "reLoginUserWithRefreshTokenDB",
			success: "true",
		});

		return result;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "reLoginUserWithRefreshTokenDB",
			success: "false",
		});
		return null;
	}
}

export async function removeExpiredUsersTokensDB() {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const now = new Date();
		const result = await User.updateMany(
			{
				"refreshTokens.deadline": {
					$lt: now,
				},
			},
			{
				$pull: {
					refreshTokens: {
						deadline: {
							$lt: now,
						},
					},
				},
			},
		);

		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "removeExpiredUsersTokensDB",
			success: "true",
		});

		return result.acknowledged;
	} catch {
		timer({
			operation: IOperationType.Update,
			collection: collectionName,
			method: "removeExpiredUsersTokensDB",
			success: "false",
		});
		return false;
	}
}

export async function getUserByIdDB({
	id,
	session,
}: {
	id: string;
	session?: ClientSession;
}): Promise<IUser | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result =
			(
				await User.aggregate<IUser>(
					[
						{ $match: { _id: new mongoose.Types.ObjectId(id) } },
						{ $limit: 1 },
					],
					{ session },
				)
			).at(0) ?? null;

		if (!result) throw ErrUserNotFound;

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUserByIdDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUserByIdDB",
			success: "false",
		});
		return null;
	}
}

export async function getUserByEmailDB({
	email,
	session,
}: {
	email: string;
	session?: ClientSession;
}): Promise<IUser | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = (
			await User.aggregate<IUser>(
				[
					{
						$match: {
							email: { $regex: email, $options: "i" },
						},
					},
					{ $limit: 1 },
				],
				{
					session,
				},
			)
		)?.at(0);

		if (!result) throw ErrUserNotFound;

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUserByEmailDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUserByEmailDB",
			success: "false",
		});
		return null;
	}
}

export async function getUsersByIdsDB({
	ids,
	offset,
	limit,
	session,
}: {
	ids: string[];
	offset: number;
	limit: number;
	session?: ClientSession;
}): Promise<IUser[]> {
	const timer = databaseResponseTimeHistogram.startTimer();
	const safeLimit = Math.min(limit, MAX_LIMIT);
	try {
		const result = await User.aggregate<IUser>(
			[
				{
					$match: {
						_id: {
							$in: ids.map(
								(id) => new mongoose.Types.ObjectId(id),
							),
						},
					},
				},
				{ $skip: offset },
				{ $limit: safeLimit },
			],
			{ session },
		);
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUsersByIdsDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUsersByIdsDB",
			success: "false",
		});
		return [];
	}
}

export async function getUserByEmailWithPasswordDB({
	email,
	session,
}: {
	email: string;
	session?: ClientSession;
}): Promise<(IUser & { password: string }) | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await User.findOne({ email, deleted: false }, null, {
			session,
		}).select("+password");

		if (!result) throw ErrUserNotFound;

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUserByEmailWithPasswordDB",
			success: "true",
		});
		return { ...result.toObject(), id: result.id } as IUser & {
			password: string;
		};
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUserByEmailWithPasswordDB",
			success: "false",
		});
		return null;
	}
}

export async function getUserByIdWithPasswordDB({
	id,
	session,
}: {
	id: string;
	session?: ClientSession;
}): Promise<(IUser & { password: string }) | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await User.findById(
			new mongoose.Types.ObjectId(id),
			null,
			{
				session,
			},
		).select("+password");

		if (!result) throw ErrUserNotFound;

		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUserByIdWithPasswordDB",
			success: "true",
		});
		return { ...result.toObject(), id: result.id } as IUser & {
			password: string;
		};
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUserByIdWithPasswordDB",
			success: "false",
		});
		return null;
	}
}

export async function getUsersByEmailsDB({
	emails,
	offset,
	limit,
	session,
}: {
	emails: string[];
	offset: number;
	limit: number;
	session?: ClientSession;
}): Promise<IUser[]> {
	const timer = databaseResponseTimeHistogram.startTimer();
	const safeLimit = Math.min(limit, MAX_LIMIT);
	try {
		const result = await User.aggregate<IUser>(
			[
				{
					$match: {
						email: { $in: emails },
					},
				},
				{ $skip: offset },
				{ $limit: safeLimit },
			],
			{ session },
		);
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUsersByEmailsDB",
			success: "true",
		});
		return result;
	} catch {
		timer({
			operation: IOperationType.Read,
			collection: collectionName,
			method: "getUsersByEmailsDB",
			success: "false",
		});
		return [];
	}
}
