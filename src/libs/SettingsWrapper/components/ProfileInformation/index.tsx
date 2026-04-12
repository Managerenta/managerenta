"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useReducer, useState } from "react";
import { toast } from "react-toastify";
import useSWR from "swr";
import { Box, Button, Input, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { ProfileInformationStyled } from "./styled";

interface IUserProfileResponse {
	data?: {
		name?: string;
		email?: string;
		phone?: string;
	};
}

interface ProfileState {
	name: string;
	email: string;
	phone: string;
}

type ProfileAction =
	| { type: "SET_FIELD"; field: keyof ProfileState; value: string }
	| { type: "RESET"; payload: ProfileState };

function reducer(state: ProfileState, action: ProfileAction): ProfileState {
	switch (action.type) {
		case "SET_FIELD":
			return { ...state, [action.field]: action.value };
		case "RESET":
			return action.payload;
		default:
			return state;
	}
}

const EMPTY: ProfileState = { name: "", email: "", phone: "" };

function ProfileInformation() {
	const [isSaving, setIsSaving] = useState(false);
	const [state, dispatch] = useReducer(reducer, EMPTY);
	const router = useRouter();

	const {
		data: rawResponse,
		isLoading,
		mutate,
	} = useSWR<IUserProfileResponse>("/api/users/user-profile", fetcher, {
		revalidateOnMount: true,
	});
	const data = rawResponse?.data;

	useEffect(() => {
		if (data) {
			dispatch({
				type: "RESET",
				payload: {
					name: data.name ?? "",
					email: data.email ?? "",
					phone: data.phone ?? "",
				},
			});
		}
	}, [data]);

	const handleSave = useCallback(async () => {
		if (!state.name.trim()) {
			toast.error("Full name is required");
			return;
		}
		setIsSaving(true);
		try {
			const formData = new FormData();
			formData.append("name", state.name.trim());
			formData.append("email", state.email.trim());
			if (state.phone.trim()) {
				formData.append("phone", state.phone.trim());
			}

			await api().patch("/api/users", formData);
			toast.success("Profile updated successfully");
			mutate();
			router.refresh();
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, "Failed to update profile"));
		} finally {
			setIsSaving(false);
		}
	}, [state, mutate, router.refresh]);

	const handleCancel = useCallback(() => {
		if (data) {
			dispatch({
				type: "RESET",
				payload: {
					name: data.name ?? "",
					email: data.email ?? "",
					phone: data.phone ?? "",
				},
			});
		}
	}, [data]);

	return (
		<ProfileInformationStyled>
			<Text className="section-title">Profile Information</Text>

			<Box className="profile-content">
				<Box className="avatar-section">
					<Box className="avatar-placeholder" />
				</Box>

				<Box className="form-fields">
					<Box className="form-field">
						<Text className="field-label">Full Name</Text>
						<Input
							type="text"
							value={state.name}
							placeholder={
								isLoading
									? "Loading..."
									: "Enter your full name"
							}
							disabled={isLoading}
							onChange={(
								e: React.ChangeEvent<HTMLInputElement>,
							) =>
								dispatch({
									type: "SET_FIELD",
									field: "name",
									value: e.target.value,
								})
							}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Email Address</Text>
						<Box className="input-with-icon">
							<Input
								type="email"
								value={state.email}
								placeholder={
									isLoading
										? "Loading..."
										: "Enter your email"
								}
								disabled={isLoading}
								onChange={(
									e: React.ChangeEvent<HTMLInputElement>,
								) =>
									dispatch({
										type: "SET_FIELD",
										field: "email",
										value: e.target.value,
									})
								}
							/>
							<Box className="verified-icon">✓</Box>
						</Box>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Phone Number</Text>
						<Input
							type="tel"
							value={state.phone}
							placeholder="Enter your phone number"
							disabled={isLoading}
							onChange={(
								e: React.ChangeEvent<HTMLInputElement>,
							) =>
								dispatch({
									type: "SET_FIELD",
									field: "phone",
									value: e.target.value,
								})
							}
						/>
					</Box>

					<Box className="form-actions">
						<Box className="save-btn">
							<Button
								type="button"
								title={isSaving ? "Saving..." : "Save Changes"}
								handleClick={handleSave}
								disabled={isSaving || isLoading}
								background="var(--Main-Blue)"
								color="white"
								borderRadius="8px"
							/>
						</Box>
						<Box className="cancel-btn">
							<Button
								type="button"
								title="Cancel"
								handleClick={handleCancel}
								disabled={isSaving || isLoading}
								background="white"
								color="var(--Black)"
								borderRadius="8px"
							/>
						</Box>
					</Box>
				</Box>
			</Box>
		</ProfileInformationStyled>
	);
}

export default memo(ProfileInformation);
