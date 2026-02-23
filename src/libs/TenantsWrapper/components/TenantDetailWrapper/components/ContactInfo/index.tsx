"use client";
import { memo } from "react";
import { FiMail, FiPhone } from "react-icons/fi";
import { Box, Button, Text } from "@/components";
import type { ITenantDetail } from "@/types";
import { ContactInfoStyled } from "./styled";

interface IProps {
	tenantDetail: ITenantDetail;
}

function ContactInfo({ tenantDetail }: IProps) {
	const { phone, email, moveInDate, tenancyDuration } = tenantDetail;

	return (
		<ContactInfoStyled>
			<Box className="contact-header">
				<Text className="section-title">Contact Information</Text>
				<Box className="edit-link">
					<Button type="button" title="Edit" />
				</Box>
			</Box>

			<Box className="contact-grid">
				<Box className="contact-left">
					<Box className="contact-row">
						<FiPhone size={14} />
						<Text className="contact-value">{phone}</Text>
					</Box>
					<Box className="contact-row">
						<FiMail size={14} />
						<Text className="contact-value">{email}</Text>
					</Box>
				</Box>
				<Box className="contact-right">
					<Box className="contact-row">
						<Text className="contact-label">Move-in date:</Text>
						<Text className="contact-value bold">{moveInDate}</Text>
					</Box>
					<Box className="contact-row">
						<Text className="contact-label">Tenancy duration:</Text>
						<Text className="contact-value bold">
							{tenancyDuration}
						</Text>
					</Box>
				</Box>
			</Box>
		</ContactInfoStyled>
	);
}

export default memo(ContactInfo);
