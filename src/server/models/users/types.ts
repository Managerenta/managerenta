import type { IJwtPayload } from "../../types";

export interface IUserCreateInput {
	username: string;
	email: string;
	password?: string;
	name: string;
	avatar?: string;
	phone?: string;
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
}

export interface IUserMethods extends IUser {
	generateAuthToken(ip?: string): Promise<IJwtPayload>;
	hashPassword(password: string): Promise<string | null>;
}
