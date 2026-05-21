"use client";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import {
	api,
	fetcher,
	formatDateValue,
	formatMoney,
	getErrorMessage,
} from "@/constants";

export interface IUserPreferencesData {
	currency: string;
	dateFormat: string;
	language: string;
	timezone: string;
	theme: string;
}

const DEFAULTS: IUserPreferencesData = {
	currency: "NGN",
	dateFormat: "DD/MM/YYYY",
	language: "en",
	timezone: "WAT",
	theme: "system",
};

interface UserProfileResponse {
	data?: { preferences?: IUserPreferencesData };
}

export default function useUserPreferences() {
	const { data, mutate, isLoading } = useSWR<UserProfileResponse>(
		"/api/users/user-profile",
		fetcher,
		{ revalidateOnMount: true },
	);

	const preferences = useMemo<IUserPreferencesData>(() => {
		return { ...DEFAULTS, ...(data?.data?.preferences ?? {}) };
	}, [data]);

	const update = useCallback(
		async (patch: Partial<IUserPreferencesData>) => {
			try {
				await api().patch("/api/users/preferences", patch);
				await mutate();
				return true;
			} catch (err) {
				throw new Error(getErrorMessage(err, "Failed to update"));
			}
		},
		[mutate],
	);

	const money = useCallback(
		(amount: number) => formatMoney(amount, preferences.currency),
		[preferences.currency],
	);
	const date = useCallback(
		(value: Date | string) =>
			formatDateValue(value, preferences.dateFormat),
		[preferences.dateFormat],
	);

	return {
		preferences,
		isLoading,
		update,
		money,
		date,
	};
}
