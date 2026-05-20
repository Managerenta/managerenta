import type mongoose from "mongoose";

export const transactionOptions: mongoose.mongo.TransactionOptions = {
	readPreference: "primary",
	readConcern: { level: "local" },
	writeConcern: { w: "majority" },
	// maxCommitTime: 1000,
};

export enum IOperationType {
	Create = "create",
	Read = "read",
	Update = "update",
	Delete = "delete",
}
