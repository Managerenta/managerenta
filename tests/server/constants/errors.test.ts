import { describe, expect, it } from "vitest";
import {
	Err2faCodeInvalid,
	Err2faTicketInvalid,
	ErrAccountCreationFailed,
	ErrAccountRestricted,
	ErrCannotRemoveOwner,
	ErrGetFileLink,
	ErrInternalServerError,
	ErrInvalidAction,
	ErrInvalidCorsOrigin,
	ErrInvalidCredentials,
	ErrInvalidEmail,
	ErrInvalidFields,
	ErrInvalidFileType,
	ErrInvalidRole,
	ErrInvalidURL,
	ErrMissingFile,
	ErrMustKeepOneAdmin,
	ErrPasskeyChallengeExpired,
	ErrPasskeyNotFound,
	ErrPasskeyVerificationFailed,
	ErrPropertyNotFound,
	ErrResourceAlreadyExist,
	ErrResourceNotFound,
	ErrTenantNotFound,
	ErrTooManyRequests,
	ErrTryAgain,
	ErrUnauthorized,
	ErrUnitNotFound,
	ErrUserNotFound,
	ErrUsernameAlreadyExists,
	getErrorResponse,
} from "@/server/constants/errors";

const mappingTable: Array<[string, Error, number]> = [
	// 400
	["ErrInvalidURL", ErrInvalidURL, 400],
	["ErrInvalidAction", ErrInvalidAction, 400],
	["ErrInvalidFields", ErrInvalidFields, 400],
	["ErrInvalidRole", ErrInvalidRole, 400],
	["ErrInvalidEmail", ErrInvalidEmail, 400],
	["ErrInvalidFileType", ErrInvalidFileType, 400],
	["ErrMissingFile", ErrMissingFile, 400],
	// 401
	["ErrUnauthorized", ErrUnauthorized, 401],
	["ErrAccountRestricted", ErrAccountRestricted, 401],
	["ErrInvalidCorsOrigin", ErrInvalidCorsOrigin, 401],
	["ErrAccountCreationFailed", ErrAccountCreationFailed, 401],
	["ErrInvalidCredentials", ErrInvalidCredentials, 401],
	["Err2faTicketInvalid", Err2faTicketInvalid, 401],
	["Err2faCodeInvalid", Err2faCodeInvalid, 401],
	["ErrPasskeyChallengeExpired", ErrPasskeyChallengeExpired, 401],
	["ErrPasskeyVerificationFailed", ErrPasskeyVerificationFailed, 401],
	// 403
	["ErrCannotRemoveOwner", ErrCannotRemoveOwner, 403],
	["ErrMustKeepOneAdmin", ErrMustKeepOneAdmin, 403],
	// 404
	["ErrGetFileLink", ErrGetFileLink, 404],
	["ErrResourceNotFound", ErrResourceNotFound, 404],
	["ErrUserNotFound", ErrUserNotFound, 404],
	["ErrPasskeyNotFound", ErrPasskeyNotFound, 404],
	["ErrPropertyNotFound", ErrPropertyNotFound, 404],
	["ErrUnitNotFound", ErrUnitNotFound, 404],
	["ErrTenantNotFound", ErrTenantNotFound, 404],
	// 409
	["ErrResourceAlreadyExist", ErrResourceAlreadyExist, 409],
	["ErrUsernameAlreadyExists", ErrUsernameAlreadyExists, 409],
	// 429
	["ErrTooManyRequests", ErrTooManyRequests, 429],
	// 500
	["ErrInternalServerError", ErrInternalServerError, 500],
	["ErrTryAgain", ErrTryAgain, 500],
];

describe("getErrorResponse mapping table", () => {
	it.each(mappingTable)("%s -> %i", (_name, error, expectedCode) => {
		const response = getErrorResponse(error);
		expect(response.code).toBe(expectedCode);
		// Message is the error text with the "Error: " prefix stripped.
		expect(response.message).toBe(error.message);
		expect(response.message.startsWith("Error: ")).toBe(false);
		// The original error object rides along untouched.
		expect(response.data).toBe(error);
	});

	it("maps a few sentinel errors to their exact user-facing messages", () => {
		expect(getErrorResponse(ErrInvalidURL).message).toBe("Invalid url");
		expect(getErrorResponse(ErrUnauthorized).message).toBe("Unauthorized");
		expect(getErrorResponse(ErrTooManyRequests).message).toBe(
			"Too many requests, please try again later.",
		);
	});
});

describe("getErrorResponse unknown errors", () => {
	it("maps an unknown error to 500 with a generic message (no detail leak)", () => {
		const secretive = new Error(
			"connection to db-internal-host:27017 refused",
		);
		const response = getErrorResponse(secretive);
		expect(response.code).toBe(500);
		expect(response.message).toBe("Internal server error");
		expect(response.message).not.toContain("db-internal-host");
		expect(response.data).toBe(secretive);
	});

	it("treats an equal-message but different Error instance as unknown", () => {
		// The switch matches by reference, not message.
		const lookalike = new Error("Invalid url");
		const response = getErrorResponse(lookalike);
		expect(response.code).toBe(500);
		expect(response.message).toBe("Internal server error");
	});
});
