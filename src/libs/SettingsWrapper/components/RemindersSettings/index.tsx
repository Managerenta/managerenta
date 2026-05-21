"use client";
import { memo, useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { Box, Button, Input, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { RemindersSettingsStyled } from "./styled";

interface RemindersState {
	rentDueLeadDays: number;
	overdueRepeatDays: number;
	autoSendOnDueDay: boolean;
	autoSendForOverdue: boolean;
	leaseExpiryLeadDays: number;
}

const DEFAULTS: RemindersState = {
	rentDueLeadDays: 3,
	overdueRepeatDays: 7,
	autoSendOnDueDay: true,
	autoSendForOverdue: true,
	leaseExpiryLeadDays: 14,
};

function RemindersSettings() {
	const toast = useToast();
	const { data, mutate, isLoading } = useSWR<{
		data?: { reminders?: RemindersState };
	}>("/api/users/user-profile", fetcher, { revalidateOnMount: true });

	const [state, setState] = useState<RemindersState>(DEFAULTS);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (data?.data?.reminders) {
			setState({ ...DEFAULTS, ...data.data.reminders });
		}
	}, [data]);

	const save = useCallback(async () => {
		setSaving(true);
		try {
			await api().patch("/api/users/reminders", state);
			await mutate();
			toast.push("Reminders saved", { type: "success" });
		} catch (err) {
			toast.push(getErrorMessage(err, "Failed to save"), {
				type: "warn",
			});
		} finally {
			setSaving(false);
		}
	}, [state, mutate, toast]);

	const toggle = useCallback(
		(key: "autoSendOnDueDay" | "autoSendForOverdue") =>
			setState((prev) => ({ ...prev, [key]: !prev[key] })),
		[],
	);

	const setNumber = useCallback(
		(
			key:
				| "rentDueLeadDays"
				| "overdueRepeatDays"
				| "leaseExpiryLeadDays",
		) =>
			(e: React.ChangeEvent<HTMLInputElement>) => {
				const n = Math.max(
					0,
					Math.min(90, Number(e.target.value) || 0),
				);
				setState((prev) => ({ ...prev, [key]: n }));
			},
		[],
	);

	return (
		<RemindersSettingsStyled>
			<Text className="section-title">Automated Reminders</Text>

			<Box className="row">
				<Box className="row-text">
					<Text className="row-label">Send reminders on due day</Text>
					<Text className="row-desc">
						If enabled, tenants get a polite reminder N days before
						the rent due date.
					</Text>
				</Box>
				<Box
					className={`toggle-switch ${
						state.autoSendOnDueDay ? "active" : ""
					}`}
					onClick={() => toggle("autoSendOnDueDay")}
				>
					<Box className="toggle-thumb" />
				</Box>
			</Box>

			<Box className="form-field">
				<Text className="field-label">Rent due lead time (days)</Text>
				<Input
					type="number"
					value={String(state.rentDueLeadDays)}
					onChange={setNumber("rentDueLeadDays")}
				/>
			</Box>

			<Box className="row">
				<Box className="row-text">
					<Text className="row-label">Re-send overdue reminders</Text>
					<Text className="row-desc">
						If enabled, tenants get an overdue reminder every N days
						after rent is past due.
					</Text>
				</Box>
				<Box
					className={`toggle-switch ${
						state.autoSendForOverdue ? "active" : ""
					}`}
					onClick={() => toggle("autoSendForOverdue")}
				>
					<Box className="toggle-thumb" />
				</Box>
			</Box>

			<Box className="form-field">
				<Text className="field-label">
					Overdue repeat interval (days)
				</Text>
				<Input
					type="number"
					value={String(state.overdueRepeatDays)}
					onChange={setNumber("overdueRepeatDays")}
				/>
			</Box>

			<Box className="form-field">
				<Text className="field-label">
					Lease expiry warning (days before)
				</Text>
				<Input
					type="number"
					value={String(state.leaseExpiryLeadDays)}
					onChange={setNumber("leaseExpiryLeadDays")}
				/>
			</Box>

			<Box className="save-btn">
				<Button
					type="button"
					title={saving ? "Saving…" : "Save reminders"}
					disabled={saving || isLoading}
					background="var(--Main-Blue)"
					color="white"
					borderRadius="8px"
					handleClick={save}
				/>
			</Box>
		</RemindersSettingsStyled>
	);
}

export default memo(RemindersSettings);
