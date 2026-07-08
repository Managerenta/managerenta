import mongoose, { type ClientSession } from "mongoose";
import { databaseResponseTimeHistogram } from "../../metrics";
import { IOperationType } from "../../models/utils";
import type { IIamOperator, IIamOperatorCreateInput } from "./types";

const collectionName = "iamoperators";

/**
 * A platform-plane identity (staff / super-admin). Kept separate from tenant
 * `users` so platform access can never leak from an ordinary signup. `userId`
 * links to an existing users doc for login / MFA.
 */
const schema = new mongoose.Schema<IIamOperator>(
	{
		userId: { type: mongoose.Types.ObjectId, required: true, unique: true },
		status: {
			type: String,
			enum: ["active", "disabled"],
			required: true,
			default: "active",
		},
	},
	{ timestamps: { createdAt: true, updatedAt: false } },
);

export const IamOperator: mongoose.Model<IIamOperator> =
	(mongoose.models[collectionName] as
		| mongoose.Model<IIamOperator>
		| undefined) ?? mongoose.model<IIamOperator>(collectionName, schema);

function toObjectId(
	value: mongoose.Types.ObjectId | string,
): mongoose.Types.ObjectId {
	return typeof value === "string"
		? new mongoose.Types.ObjectId(value)
		: value;
}

export async function createIamOperatorDB({
	payload,
	session,
}: {
	payload: IIamOperatorCreateInput;
	session?: ClientSession;
}): Promise<IIamOperator | null> {
	const timer = databaseResponseTimeHistogram.startTimer();
	try {
		const result = await IamOperator.create(
			[{ userId: toObjectId(payload.userId), status: payload.status }],
			{ session },
		).then((res) => res[0]);
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createIamOperatorDB",
			success: "true",
		});
		return result ?? null;
	} catch {
		timer({
			operation: IOperationType.Create,
			collection: collectionName,
			method: "createIamOperatorDB",
			success: "false",
		});
		return null;
	}
}

export async function countIamOperatorsDB({
	session,
}: {
	session?: ClientSession;
} = {}): Promise<number> {
	try {
		return await IamOperator.countDocuments({}, { session });
	} catch {
		return 0;
	}
}

export async function listIamOperatorsDB({
	session,
}: {
	session?: ClientSession;
} = {}): Promise<IIamOperator[]> {
	try {
		return await IamOperator.find({}, null, { session })
			.sort({ createdAt: -1 })
			.lean<IIamOperator[]>();
	} catch {
		return [];
	}
}

export async function countActiveIamOperatorsDB({
	session,
}: {
	session?: ClientSession;
} = {}): Promise<number> {
	try {
		return await IamOperator.countDocuments(
			{ status: "active" },
			{ session },
		);
	} catch {
		return 0;
	}
}

export async function getIamOperatorByUserIdDB({
	userId,
	session,
}: {
	userId: string;
	session?: ClientSession;
}): Promise<IIamOperator | null> {
	try {
		return await IamOperator.findOne({ userId: toObjectId(userId) }, null, {
			session,
		}).lean<IIamOperator>();
	} catch {
		return null;
	}
}

export async function setIamOperatorStatusDB({
	userId,
	status,
	session,
}: {
	userId: string;
	status: "active" | "disabled";
	session?: ClientSession;
}): Promise<IIamOperator | null> {
	try {
		return await IamOperator.findOneAndUpdate(
			{ userId: toObjectId(userId) },
			{ status },
			{ returnDocument: "after", session },
		);
	} catch {
		return null;
	}
}
