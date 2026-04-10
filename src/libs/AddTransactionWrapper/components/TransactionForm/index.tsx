"use client";
import {
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { FiHome, FiPlus, FiTool, FiZap } from "react-icons/fi";
import { toast } from "react-toastify";
import { Box, Button, Input, Text } from "@/components";
import { api } from "@/constants";
import { AppContextProvider, useAddTransactionNavigation } from "@/hooks";
import { TransactionFormStyled } from "./styled";

interface IProps {
	tenantId: string;
	monthlyRent: string;
}

const TRANSACTION_TYPES = [
	{
		id: "type-001",
		label: "Rent Payment",
		value: "rent",
		icon: <FiHome size={22} />,
	},
	{
		id: "type-002",
		label: "Maintenance",
		value: "maintenance",
		icon: <FiTool size={22} />,
	},
	{
		id: "type-003",
		label: "Utilities",
		value: "utilities",
		icon: <FiZap size={22} />,
	},
	{
		id: "type-004",
		label: "Other",
		value: "other",
		icon: <FiPlus size={22} />,
	},
];

const PAYMENT_METHODS = [
	{ id: "pm-001", label: "Bank Transfer", value: "bank-transfer" },
	{ id: "pm-002", label: "Cash", value: "cash" },
	{ id: "pm-003", label: "Mobile Money", value: "mobile-money" },
	{ id: "pm-004", label: "Card Payment", value: "card" },
	{ id: "pm-005", label: "Check", value: "check" },
];

const PERIODS = [
	{ id: "p-1", label: "Monthly (1 month)", value: 1 },
	{ id: "p-3", label: "Quarterly (3 months)", value: 3 },
	{ id: "p-6", label: "Bi-annually (6 months)", value: 6 },
	{ id: "p-12", label: "Annually (12 months)", value: 12 },
	{ id: "p-24", label: "2 Years (24 months)", value: 24 },
];

function TransactionForm({ tenantId, monthlyRent }: IProps) {
	const { env } = useContext(AppContextProvider);
	const { closeAddTransaction } = useAddTransactionNavigation();
	const [selectedType, setSelectedType] = useState("rent");
	const [period, setPeriod] = useState(1);
	const [amount, setAmount] = useState("");
	const [notes, setNotes] = useState("");
	const [transactionDate, setTransactionDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [paymentMethod, setPaymentMethod] = useState("bank-transfer");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const rawMonthlyRent = useMemo(() => {
		if (!monthlyRent) return 0;
		return (
			parseFloat(
				monthlyRent
					.replace(/[₦,]/g, "")
					.replace(/\/month/g, "")
					.trim(),
			) || 0
		);
	}, [monthlyRent]);

	// Auto-fill amount when type is rent and period or rent changes
	useEffect(() => {
		if (selectedType === "rent" && rawMonthlyRent > 0) {
			setAmount((rawMonthlyRent * period).toLocaleString("en-NG"));
		}
	}, [selectedType, period, rawMonthlyRent]);

	const renderedTypes = useMemo(() => {
		return TRANSACTION_TYPES.map(({ id, label, value, icon }) => (
			<Box
				key={id}
				className={`type-card ${selectedType === value ? "active" : ""}`}
				onClick={() => setSelectedType(value)}
			>
				<Box className="type-icon">{icon}</Box>
				<Text className="type-label">{label}</Text>
			</Box>
		));
	}, [selectedType]);

	const renderedPaymentMethods = useMemo(() => {
		return PAYMENT_METHODS.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, []);

	const renderedPeriods = useMemo(() => {
		return PERIODS.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, []);

	const handleCancel = useCallback(() => {
		closeAddTransaction();
	}, [closeAddTransaction]);

	const handleSave = useCallback(async () => {
		const parsedAmount = parseFloat(amount.replace(/,/g, ""));
		if (!parsedAmount || parsedAmount <= 0) {
			toast.error("Please enter a valid amount");
			return;
		}
		if (!transactionDate) {
			toast.error("Please select a transaction date");
			return;
		}
		setIsSubmitting(true);
		try {
			await api().post(
				`${env.MAIN_SERVICE_URL}/api/tenants/${tenantId}/transactions`,
				{
					type: selectedType,
					amount: parsedAmount,
					description: notes.trim() || undefined,
					date: new Date(transactionDate).toISOString(),
					paymentMethod,
					...(selectedType === "rent" && period > 1
						? { period }
						: {}),
				},
			);
			toast.success("Transaction recorded successfully");
			closeAddTransaction();
		} catch (err: unknown) {
			const message =
				(err as { response?: { data?: { message?: string } } })
					?.response?.data?.message ?? "Failed to record transaction";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	}, [
		tenantId,
		selectedType,
		period,
		amount,
		notes,
		transactionDate,
		paymentMethod,
		env.MAIN_SERVICE_URL,
		closeAddTransaction,
	]);

	return (
		<TransactionFormStyled>
			<Box className="form-section">
				<Text className="section-label">Transaction Type</Text>
				<Box className="type-grid">{renderedTypes}</Box>
			</Box>

			{selectedType === "rent" && (
				<Box className="form-row single">
					<Box className="form-field half">
						<Text className="field-label">Payment Period</Text>
						<select
							className="method-select"
							value={period}
							onChange={(e) => setPeriod(Number(e.target.value))}
						>
							{renderedPeriods}
						</select>
					</Box>
				</Box>
			)}

			<Box className="form-row">
				<Box className="form-field">
					<Text className="field-label">
						Amount (₦)
						{selectedType === "rent" && period > 1 && (
							<span
								style={{
									color: "#64748b",
									fontWeight: 400,
									marginLeft: "6px",
								}}
							>
								{period} × ₦
								{rawMonthlyRent.toLocaleString("en-NG")}
							</span>
						)}
					</Text>
					<Box className="amount-input">
						<Text className="currency-prefix">₦</Text>
						<Input
							type="text"
							value={amount}
							onChange={(
								e: React.ChangeEvent<HTMLInputElement>,
							) => setAmount(e.target.value)}
							placeholder="0"
						/>
					</Box>
				</Box>

				<Box className="form-field">
					<Text className="field-label">
						Description/Notes{" "}
						<span style={{ color: "#94a3b8", fontWeight: 400 }}>
							(Optional)
						</span>
					</Text>
					<textarea
						className="notes-textarea"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Add notes about this transaction..."
						rows={4}
					/>
				</Box>
			</Box>

			<Box className="form-row single">
				<Box className="form-field half">
					<Text className="field-label">Transaction Date</Text>
					<Input
						type="date"
						value={transactionDate}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setTransactionDate(e.target.value)
						}
					/>
				</Box>

				<Box className="form-field half">
					<Text className="field-label">Payment Method</Text>
					<select
						className="method-select"
						value={paymentMethod}
						onChange={(e) => setPaymentMethod(e.target.value)}
					>
						{renderedPaymentMethods}
					</select>
				</Box>
			</Box>

			<Box className="form-actions">
				<Box className="cancel-btn">
					<Button
						type="button"
						title="Cancel"
						handleClick={handleCancel}
						disabled={isSubmitting}
						background="white"
						color="var(--Black)"
						border="1px solid #e2e8f0"
						borderRadius="8px"
					/>
				</Box>
				<Box className="save-btn">
					<Button
						type="button"
						title={isSubmitting ? "Saving..." : "Save Transaction"}
						handleClick={handleSave}
						disabled={isSubmitting}
						background="#ef4444"
						color="white"
						borderRadius="8px"
					/>
				</Box>
			</Box>
		</TransactionFormStyled>
	);
}

export default memo(TransactionForm);
