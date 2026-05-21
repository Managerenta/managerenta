"use client";
import { useRouter } from "next/navigation";
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { FiCamera } from "react-icons/fi";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { toast } from "react-toastify";
import useSWR from "swr";
import { Box, Button, Image, Input, Text } from "@/components";
import {
	api,
	fetcher,
	getErrorMessage,
	supportedImageMimeTypes,
} from "@/constants";
import { ProfileInformationStyled } from "./styled";

interface IUserProfileResponse {
	data?: {
		name?: string;
		email?: string;
		phone?: string;
		avatar?: string;
	};
}

interface ProfileState {
	name: string;
	email: string;
	phone: string;
	avatar: string;
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

const EMPTY: ProfileState = { name: "", email: "", phone: "", avatar: "" };
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function ProfileInformation() {
	const [isSaving, setIsSaving] = useState(false);
	const [state, dispatch] = useReducer(reducer, EMPTY);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string>("");
	const [mounted, setMounted] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const router = useRouter();

	useEffect(() => setMounted(true), []);

	const {
		data: rawResponse,
		isLoading: swrLoading,
		mutate,
	} = useSWR<IUserProfileResponse>("/api/users/user-profile", fetcher, {
		revalidateOnMount: true,
	});
	const data = rawResponse?.data;
	const isLoading = mounted ? swrLoading : false;

	useEffect(() => {
		if (data) {
			dispatch({
				type: "RESET",
				payload: {
					name: data.name ?? "",
					email: data.email ?? "",
					phone: data.phone ?? "",
					avatar: data.avatar ?? "",
				},
			});
		}
	}, [data]);

	useEffect(() => {
		if (!avatarFile) {
			setAvatarPreview("");
			return;
		}
		const url = URL.createObjectURL(avatarFile);
		setAvatarPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [avatarFile]);

	const displayedAvatar = useMemo(
		() => avatarPreview || state.avatar,
		[avatarPreview, state.avatar],
	);

	const acceptAttr = useMemo(() => supportedImageMimeTypes.join(","), []);

	const openFilePicker = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			if (!supportedImageMimeTypes.includes(file.type)) {
				toast.error("Unsupported image format");
				return;
			}
			if (file.size > MAX_AVATAR_BYTES) {
				toast.error("Image must be 5MB or smaller");
				return;
			}
			setAvatarFile(file);
			e.target.value = "";
		},
		[],
	);

	const handleSave = useCallback(async () => {
		if (!state.name.trim()) {
			toast.error("Full name is required");
			return;
		}
		if (state.phone && !isValidPhoneNumber(state.phone)) {
			toast.error("Please enter a valid phone number");
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
			if (avatarFile) {
				formData.append("avatar", avatarFile);
			}

			await api().patch("/api/users", formData);
			toast.success("Profile updated successfully");
			setAvatarFile(null);
			mutate();
			router.refresh();
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, "Failed to update profile"));
		} finally {
			setIsSaving(false);
		}
	}, [state, avatarFile, mutate, router.refresh]);

	const handleCancel = useCallback(() => {
		setAvatarFile(null);
		if (data) {
			dispatch({
				type: "RESET",
				payload: {
					name: data.name ?? "",
					email: data.email ?? "",
					phone: data.phone ?? "",
					avatar: data.avatar ?? "",
				},
			});
		}
	}, [data]);

	return (
		<ProfileInformationStyled>
			<Text className="section-title">Profile Information</Text>

			<Box className="profile-content">
				<Box className="avatar-section">
					<Box className="avatar-wrapper" onClick={openFilePicker}>
						{displayedAvatar ? (
							<Image
								url={displayedAvatar}
								alt="Profile avatar"
								width="120px"
								height="120px"
								borderRadius="50%"
								style={{ objectFit: "cover" }}
							/>
						) : (
							<Box className="avatar-placeholder" />
						)}
						<Box className="avatar-overlay">
							<FiCamera size={20} />
							<Text>Change</Text>
						</Box>
					</Box>
					<input
						ref={fileInputRef}
						type="file"
						accept={acceptAttr}
						hidden
						onChange={handleFileChange}
					/>
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
						<Box className="phone-input-wrap">
							<PhoneInput
								international
								defaultCountry="NG"
								value={state.phone}
								disabled={isLoading}
								placeholder="Enter your phone number"
								onChange={(value) =>
									dispatch({
										type: "SET_FIELD",
										field: "phone",
										value: value ?? "",
									})
								}
							/>
						</Box>
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
								background="var(--Surface-Card)"
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
