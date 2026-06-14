"use client";
import { memo, useCallback, useMemo, useState } from "react";
import { BsCalculator } from "react-icons/bs";
import { FiAlertCircle, FiCheckCircle, FiHome, FiTool } from "react-icons/fi";
import useSWR from "swr";
import { Box, Button, Select, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useToast } from "@/hooks";
import { categoryOptions } from "../shared/options";
import { PortalStyled } from "./styled";

interface IPortalTransaction {
	id: string;
	date: string;
	type: string;
	description: string;
	amount: number;
	amountType: "credit" | "debit";
	paymentMethod?: string;
}

interface IPortalSummary {
	tenant: {
		id: string;
		name: string;
		email?: string;
		phone?: string;
		moveInDate?: string;
		leaseExpiry?: string;
		rentDueDay: number;
	};
	property: { id: string; name: string; address?: string } | null;
	unit: { id: string; name: string; rent: number } | null;
	balance: { outstanding: number; totalPaid: number; monthlyRent: number };
	transactions: IPortalTransaction[];
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const fmtDate = (d?: string) =>
	d ? new Date(d).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "—";

function PortalWrapper({ token }: { token: string }) {
	const toast = useToast();
	const { data, error, isLoading, mutate } = useSWR<{
		data?: IPortalSummary;
	}>(`/api/portal/${token}`, fetcher, {
		revalidateOnMount: true,
		shouldRetryOnError: false,
	});

	const summary = data?.data;

	const [form, setForm] = useState({
		title: "",
		category: "",
		description: "",
	});
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = useCallback(async () => {
		if (!form.title.trim() || !form.category) {
			toast.push("Add a title and category", { type: "warn" });
			return;
		}
		setSubmitting(true);
		try {
			await api().post(`/api/portal/${token}/maintenance`, {
				title: form.title.trim(),
				category: form.category,
				description: form.description.trim() || form.title.trim(),
			});
			toast.push("Maintenance request submitted", { type: "success" });
			setForm({ title: "", category: "", description: "" });
			await mutate();
		} catch (err) {
			toast.push(getErrorMessage(err), { type: "warn" });
		} finally {
			setSubmitting(false);
		}
	}, [form, token, toast, mutate]);

	const rows = useMemo(
		() =>
			(summary?.transactions ?? []).map((t) => (
				<tr key={t.id}>
					<td>{fmtDate(t.date)}</td>
					<td style={{ textTransform: "capitalize" }}>{t.type}</td>
					<td>{t.description || "—"}</td>
					<td
						style={{
							textAlign: "right",
							color:
								t.amountType === "credit"
									? "var(--Success-700)"
									: "var(--Error-600)",
							fontWeight: 600,
						}}
					>
						{t.amountType === "credit" ? "+" : "−"}
						{naira(t.amount)}
					</td>
				</tr>
			)),
		[summary],
	);

	if (error || (!isLoading && !summary)) {
		return (
			<PortalStyled>
				<Box className="portal-shell">
					<Box className="error-card">
						<FiAlertCircle size={28} color="var(--Error-600)" />
						<Text className="error-title">Link unavailable</Text>
						<Text className="error-sub">
							This portal link is invalid or has expired. Please
							ask your property manager for a new one.
						</Text>
					</Box>
				</Box>
			</PortalStyled>
		);
	}

	const outstanding = summary?.balance.outstanding ?? 0;

	return (
		<PortalStyled>
			<Box className="portal-topbar">
				<Box className="brand">
					<BsCalculator />
					<Text className="brand-name">manageRenta</Text>
				</Box>
				<Text className="portal-tag">Tenant Portal</Text>
			</Box>

			<Box className="portal-shell">
				<Box className="hero">
					<Text className="hello">
						Hello{summary ? `, ${summary.tenant.name}` : ""}
					</Text>
					<Text className="hero-sub">
						<FiHome size={14} />
						{summary?.property?.name ?? "—"}
						{summary?.unit ? ` · Unit ${summary.unit.name}` : ""}
					</Text>
				</Box>

				<Box className="cards">
					<Box
						className={`balance-card ${outstanding > 0 ? "due" : "clear"}`}
					>
						<Text className="bc-label">Outstanding Balance</Text>
						<Text className="bc-value">{naira(outstanding)}</Text>
						<Text className="bc-meta">
							{outstanding > 0 ? (
								<>
									<FiAlertCircle size={13} /> Payment due
								</>
							) : (
								<>
									<FiCheckCircle size={13} /> You're all
									caught up
								</>
							)}
						</Text>
						<Button
							title="Make a Payment"
							fullWidth
							handleClick={() =>
								toast.push(
									"Online payments are coming soon — please pay via your usual method.",
									{ type: "info", duration: 4000 },
								)
							}
						/>
					</Box>

					<Box className="info-card">
						<Box className="info-row">
							<Text className="ir-label">Monthly Rent</Text>
							<Text className="ir-value">
								{naira(summary?.balance.monthlyRent ?? 0)}
							</Text>
						</Box>
						<Box className="info-row">
							<Text className="ir-label">Rent Due Day</Text>
							<Text className="ir-value">
								Day {summary?.tenant.rentDueDay ?? "—"}
							</Text>
						</Box>
						<Box className="info-row">
							<Text className="ir-label">Lease Expires</Text>
							<Text className="ir-value">
								{fmtDate(summary?.tenant.leaseExpiry)}
							</Text>
						</Box>
						<Box className="info-row">
							<Text className="ir-label">Total Paid</Text>
							<Text className="ir-value">
								{naira(summary?.balance.totalPaid ?? 0)}
							</Text>
						</Box>
					</Box>
				</Box>

				<Box className="section">
					<Text className="section-title">Payment History</Text>
					<Box className="panel">
						<Box className="table-scroll">
							<table>
								<thead>
									<tr>
										<th>Date</th>
										<th>Type</th>
										<th>Description</th>
										<th style={{ textAlign: "right" }}>
											Amount
										</th>
									</tr>
								</thead>
								<tbody>{rows}</tbody>
							</table>
						</Box>
						{!isLoading &&
						(summary?.transactions.length ?? 0) === 0 ? (
							<Box className="empty">No transactions yet.</Box>
						) : null}
					</Box>
				</Box>

				<Box className="section">
					<Text className="section-title">
						<FiTool size={15} /> Request Maintenance
					</Text>
					<Box className="maint-form">
						<Box className="mf-field full">
							<Text className="mf-label">What's the issue?</Text>
							<input
								value={form.title}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										title: e.target.value,
									}))
								}
								placeholder="e.g. Bathroom sink is blocked"
							/>
						</Box>
						<Box className="mf-field">
							<Text className="mf-label">Category</Text>
							<Select
								options={categoryOptions}
								value={form.category}
								onChange={(v) =>
									setForm((p) => ({ ...p, category: v }))
								}
								placeholder="Select category"
							/>
						</Box>
						<Box className="mf-field full">
							<Text className="mf-label">Details (optional)</Text>
							<textarea
								rows={3}
								value={form.description}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										description: e.target.value,
									}))
								}
								placeholder="Anything that would help us fix it faster"
							/>
						</Box>
						<Box className="mf-actions">
							<Button
								title="Submit Request"
								handleClick={handleSubmit}
								disabled={submitting}
							/>
						</Box>
					</Box>
				</Box>

				<Text className="portal-foot">
					Powered by Managerenta · For help, contact your property
					manager.
				</Text>
			</Box>
		</PortalStyled>
	);
}

export default memo(PortalWrapper);
