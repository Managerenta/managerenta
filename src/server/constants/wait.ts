/**
 * Pauses the execution for the specified number of seconds.
 * @param seconds - The number of seconds to wait.
 * @returns A promise that resolves after the specified number of seconds.
 */
export default async function wait(seconds: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, seconds * 1000);
	});
}
