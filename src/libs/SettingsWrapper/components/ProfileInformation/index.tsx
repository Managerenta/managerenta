"use client";
import { memo, useState, useCallback } from "react";
import { Box, Button, Input, Text } from "@/components";
import { ProfileInformationStyled } from "./styled";

function ProfileInformation() {
	const [fullName, setFullName] = useState<string>("Adebayo Ogundimu");
	const [email, setEmail] = useState<string>("adebayo.o@propertytrack.ng");
	const [phone, setPhone] = useState<string>("+234 803 123 4567");

	const handleSave = useCallback(() => {
		console.log("Save profile:", { fullName, email, phone });
	}, [fullName, email, phone]);

	const handleCancel = useCallback(() => {
		setFullName("Adebayo Ogundimu");
		setEmail("adebayo.o@propertytrack.ng");
		setPhone("+234 803 123 4567");
	}, []);

	return (
		<ProfileInformationStyled>
			<Text className="section-title">Profile Information</Text>

			<Box className="profile-content">
				<Box className="avatar-section">
					{/* TODO: Replace with Image when ready */}
					<Box className="avatar-placeholder" />
				</Box>

				<Box className="form-fields">
					<Box className="form-field">
						<Text className="field-label">Full Name</Text>
						<Input
							type="text"
							value={fullName}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setFullName(e.target.value)
							}
						/>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Email Address</Text>
						<Box className="input-with-icon">
							<Input
								type="email"
								value={email}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setEmail(e.target.value)
								}
							/>
							<Box className="verified-icon">✓</Box>
						</Box>
					</Box>

					<Box className="form-field">
						<Text className="field-label">Phone Number</Text>
						<Input
							type="text"
							value={phone}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setPhone(e.target.value)
							}
						/>
					</Box>

					<Box className="form-actions">
						<Box className="save-btn">
							<Button
								type="button"
								title="Save Changes"
								handleClick={handleSave}
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
