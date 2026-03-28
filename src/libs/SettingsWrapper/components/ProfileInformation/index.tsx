"use client";
import { useRouter } from "next/navigation";
import {
	memo,
	useCallback,
	useContext,
	useEffect,
	useReducer,
	useState,
} from "react";
import { toast } from "react-toastify";
import useSWR from "swr";
import { Box, Button, Input, Text } from "@/components";
import { api } from "@/constants";
import { AppContextProvider } from "@/hooks";
import { ProfileInformationStyled } from "./styled";

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
	const { env } = useContext(AppContextProvider);
	const [isSaving, setIsSaving] = useState(false);
	const [state, dispatch] = useReducer(reducer, EMPTY);
	const router = useRouter();

	const { data, isLoading, mutate } = useSWR(
		`${env.MAIN_SERVICE_URL}/api/users/user-profile`,
		(url: string) =>
			api()
				.get(url)
				.then((r) => r.data?.data),
		{ revalidateOnMount: true },
	);

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

			await api().patch(`${env.MAIN_SERVICE_URL}/api/users`, formData);
			toast.success("Profile updated successfully");
			mutate();
			router.refresh();
		} catch (err: unknown) {
			const message =
				(err as { response?: { data?: { message?: string } } })?.response?.data
					?.message ?? "Failed to update profile";
			toast.error(message);
		} finally {
			setIsSaving(false);
		}
	}, [env.MAIN_SERVICE_URL, state, mutate]);

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
							placeholder={isLoading ? "Loading..." : "Enter your full name"}
							disabled={isLoading}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
								placeholder={isLoading ? "Loading..." : "Enter your email"}
								disabled={isLoading}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
