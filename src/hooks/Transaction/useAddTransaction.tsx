"use client";
import { useMemo } from "react";
import {
	FiCreditCard,
	FiDollarSign,
	FiFileText,
	FiHome,
	FiPlus,
	FiTool,
	FiZap,
} from "react-icons/fi";
import type {
	IKeyboardShortcut,
	IPaymentHistoryItem,
	ISmartSuggestion,
	ITransactionType,
} from "@/types";

export default function useAddTransactionData() {
	const transactionTypes = useMemo<ITransactionType[]>(() => {
		return [
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
	}, []);

	const paymentHistory = useMemo<IPaymentHistoryItem[]>(() => {
		return [
			{
				id: "ph-001",
				label: "Last Payment",
				date: "10/11/2024",
				amount: "₦450,000",
				amountColor: "#16a34a",
			},
			{
				id: "ph-002",
				label: "Previous Payment",
				date: "15/10/2024",
				amount: "₦450,000",
				amountColor: "#16a34a",
			},
			{
				id: "ph-003",
				label: "Third Last Payment",
				date: "15/09/2024",
				amount: "₦450,000",
				amountColor: "#ca8a04",
				note: "3 days late",
				noteColor: "#ca8a04",
			},
		];
	}, []);

	const averageAmount = useMemo<string>(() => "₦450,000", []);

	const smartSuggestions = useMemo<ISmartSuggestion[]>(() => {
		return [
			{
				id: "ss-001",
				label: "Standard Rent Amount",
				description: "This tenant's monthly rent is ₦450,000",
				bgColor: "#dbeafe",
				iconColor: "#2563eb",
				icon: <FiDollarSign size={16} />,
			},
			{
				id: "ss-002",
				label: "Preferred Payment Method",
				description: "Usually pays via Bank Transfer",
				bgColor: "#fef3c7",
				iconColor: "#d97706",
				icon: <FiCreditCard size={16} />,
			},
			{
				id: "ss-003",
				label: "Common Descriptions",
				description: '"Monthly rent payment"',
				bgColor: "#d1fae5",
				iconColor: "#059669",
				icon: <FiFileText size={16} />,
			},
		];
	}, []);

	const keyboardShortcuts = useMemo<IKeyboardShortcut[]>(() => {
		return [
			{ id: "ks-001", label: "Navigate fields", key: "Tab" },
			{ id: "ks-002", label: "Save transaction", key: "Ctrl+S" },
			{ id: "ks-003", label: "Cancel/Close", key: "Esc" },
		];
	}, []);

	const paymentMethods = useMemo(() => {
		return [
			{ id: "pm-001", label: "Bank Transfer", value: "bank-transfer" },
			{ id: "pm-002", label: "Cash", value: "cash" },
			{ id: "pm-003", label: "Mobile Money", value: "mobile-money" },
			{ id: "pm-004", label: "Card Payment", value: "card" },
			{ id: "pm-005", label: "Check", value: "check" },
		];
	}, []);

	return {
		transactionTypes,
		paymentHistory,
		averageAmount,
		smartSuggestions,
		keyboardShortcuts,
		paymentMethods,
	};
}
