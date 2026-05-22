// 400 error codes
export const ErrInvalidURL: Error = new Error("Invalid url");
export const ErrInvalidAction: Error = new Error("Invalid action");
export const ErrInvalidFields: Error = new Error("Invalid fields");
export const ErrInvalidRole: Error = new Error("Invalid role");
export const ErrInvalidEmail: Error = new Error("Invalid email");
export const ErrUsernameAlreadyExists: Error = new Error(
	"Username already exists",
);
export const ErrMissingFile: Error = new Error("No file provided");
export const ErrInvalidFileType: Error = new Error("Invalid file type");

// 401 error codes
export const ErrInvalidCredentials: Error = new Error(
	"Invalid username or password",
);
export const ErrAccountCreationFailed: Error = new Error(
	"Account creation failed",
);
export const ErrUnauthorized: Error = new Error("Unauthorized");
export const ErrAccountRestricted: Error = new Error("Account is restricted");
export const ErrInvalidCorsOrigin: Error = new Error(
	"Not allowed by CORS - Origin header required",
);
export const Err2faTicketInvalid: Error = new Error(
	"Two-factor challenge expired. Please sign in again.",
);
export const Err2faCodeInvalid: Error = new Error("Invalid two-factor code");
export const ErrPasskeyChallengeExpired: Error = new Error(
	"Passkey challenge expired. Please try again.",
);
export const ErrPasskeyVerificationFailed: Error = new Error(
	"Passkey verification failed",
);
export const ErrPasskeyNotFound: Error = new Error("Passkey not found");

// 403 error codes
export const ErrCannotRemoveOwner: Error = new Error(
	"The organization owner cannot be removed or demoted",
);
export const ErrMustKeepOneAdmin: Error = new Error(
	"An organization must keep at least one admin",
);

// 429 error codes
export const ErrTooManyRequests: Error = new Error(
	"Too many requests, please try again later.",
);

// 404 error codes
export const ErrResourceNotFound: Error = new Error("Resource not found");
export const ErrUserNotFound: Error = new Error("User not found");
export const ErrPropertyNotFound: Error = new Error("Property not found");
export const ErrUnitNotFound: Error = new Error("Unit not found");
export const ErrTenantNotFound: Error = new Error("Tenant not found");
export const ErrGetFileLink: Error = new Error("Unable to get file link");
// 409 error codes
export const ErrResourceAlreadyExist: Error = new Error(
	"Resource already exists",
);
export const ErrTryAgain: Error = new Error("Please try again");
// 500 error codes
export const ErrInternalServerError: Error = new Error("Internal server error");
