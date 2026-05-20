export * from "./errorMessages";

import {
	ErrAccountCreationFailed,
	ErrAccountRestricted,
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
	ErrPropertyNotFound,
	ErrResourceAlreadyExist,
	ErrResourceNotFound,
	ErrTenantNotFound,
	ErrTryAgain,
	ErrUnauthorized,
	ErrUnitNotFound,
	ErrUserNotFound,
	ErrUsernameAlreadyExists,
} from "./errorMessages";

export interface IErrorResponse {
	code: number;
	message: string;
	data: Error;
}

/**
 * It takes an error object and returns an error response object.
 * @param {Error} error - Error - the error object that was thrown
 * @returns An object with two properties: code and message.
 */
export function getErrorResponse(error: Error): IErrorResponse {
	const delimiter = "Error: ";
	let message: string = error?.toString()?.replace(delimiter, "");
	let code: number = 0;

	switch (error) {
		case ErrInvalidURL:
		case ErrInvalidAction:
		case ErrInvalidFields:
		case ErrInvalidRole:
		case ErrInvalidEmail:
		case ErrInvalidFileType:
		case ErrMissingFile:
			code = 400;
			break;

		case ErrUnauthorized:
		case ErrAccountRestricted:
		case ErrInvalidCorsOrigin:
		case ErrAccountCreationFailed:
		case ErrInvalidCredentials:
			code = 401;
			break;

		case ErrGetFileLink:
		case ErrResourceNotFound:
		case ErrUserNotFound:
		case ErrPropertyNotFound:
		case ErrUnitNotFound:
		case ErrTenantNotFound:
			code = 404;
			break;

		case ErrResourceAlreadyExist:
		case ErrUsernameAlreadyExists:
			code = 409;
			break;

		case ErrInternalServerError:
		case ErrTryAgain:
			code = 500;
			break;

		default:
			code = 500;
			message = ErrInternalServerError.toString().replace(delimiter, "");
	}
	return { code, message, data: error };
}
