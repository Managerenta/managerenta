import { describe, expect, it } from "vitest";
import {
	IOperationType,
	transactionOptions,
} from "../../../src/server/models/utils";

describe("models/utils", () => {
	it("IOperationType maps to the metric label values used by every model timer", () => {
		expect(IOperationType.Create).toBe("create");
		expect(IOperationType.Read).toBe("read");
		expect(IOperationType.Update).toBe("update");
		expect(IOperationType.Delete).toBe("delete");
		expect(Object.values(IOperationType)).toHaveLength(4);
	});

	it("transactionOptions requests primary reads and majority writes", () => {
		expect(transactionOptions.readPreference).toBe("primary");
		expect(transactionOptions.readConcern).toEqual({ level: "local" });
		expect(transactionOptions.writeConcern).toEqual({ w: "majority" });
	});
});
