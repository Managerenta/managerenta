import mongoose from "mongoose";
import { User, updateUserRawDB } from "../src/server/models/users";

async function main() {
	await mongoose.connect(process.env.MONGODB_URI ?? "", {
		dbName: process.env.DB_NAME,
	});
	await User.updateOne(
		{ email: "abdullah@example.com" },
		{ $set: { "security.passkeys": [] } },
	);

	const u = await User.findOne({ email: "abdullah@example.com" });
	console.log("user._id:", u?._id?.toString());

	const id = u?._id?.toString();
	const result = await updateUserRawDB({
		id,
		update: {
			$push: {
				"security.passkeys": {
					credentialId: "via-updateUserRawDB",
					publicKey: "pubkey",
					counter: 0,
					transports: [],
					label: "via helper",
					createdAt: new Date(),
				},
			},
		},
	});
	console.log("helper result is null:", result === null);

	const c = mongoose.connection.collection("users");
	const raw = await c.findOne({ email: "abdullah@example.com" });
	console.log("raw passkeys:", JSON.stringify(raw?.security?.passkeys));
	process.exit(0);
}

main().catch((e) => {
	console.error("FAIL:", e);
	process.exit(1);
});
