import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases";
import {
	getPropertiesByIdsDB,
	getTenantByIdDB,
	getTransactionsByTenantIdDB,
	getUnitsByIdsDB,
} from "../../models";

export function getQueryKey({
	userId,
	id,
}: {
	userId: string;
	id: string;
}): string {
	return `services:tenants:getTenantById:${userId}:${id}`;
}

export default async function getTenantById({
	id,
	userId,
	refreshCache,
}: {
	id: string;
	userId: string;
	refreshCache?: boolean;
}) {
	const query = getQueryKey({ userId, id });

	if (!refreshCache) {
		const cached = await redisRetrieveKeyString<any>(query);
		if (cached) return cached;
	}

	const tenant = await getTenantByIdDB({ id, userId });
	if (!tenant) return null;

	const transactions = await getTransactionsByTenantIdDB({
		tenantId: id,
		userId,
	});

	const [propertyDocs, unitDocs] = await Promise.all([
		getPropertiesByIdsDB({ ids: [tenant.propertyId] }),
		getUnitsByIdsDB({ ids: [tenant.unitId] }),
	]);
	const property = (propertyDocs[0] as any)?.name ?? "";
	const unitDoc = unitDocs[0] as any;
	const unit = unitDoc?.name ?? "";
	const monthlyRent = unitDoc?.rent ?? 0;

	const now = new Date();
	const rentDueDay = tenant.rentDueDay ?? 1;

	// Compute nextDueDate accounting for advance (multi-period) payments
	const rentCreditTxs = transactions.filter(
		(t) => t.amountType === "credit" && t.type === "rent",
	);

	// Find the furthest periodEnd among all rent credit transactions
	const lastAdvanceEnd = rentCreditTxs.reduce<Date | null>((max, t) => {
		if (!t.periodEnd) return max;
		const end = new Date(t.periodEnd);
		return max === null || end > max ? end : max;
	}, null);

	let nextDueDate: Date;
	if (lastAdvanceEnd && lastAdvanceEnd > now) {
		// Tenant has paid ahead; next due is rentDueDay of month after last covered month
		nextDueDate = new Date(
			lastAdvanceEnd.getFullYear(),
			lastAdvanceEnd.getMonth() + 1,
			rentDueDay,
		);
	} else {
		nextDueDate = new Date(now.getFullYear(), now.getMonth(), rentDueDay);
		if (nextDueDate <= now) {
			nextDueDate.setMonth(nextDueDate.getMonth() + 1);
		}
	}

	const lastCreditTx = rentCreditTxs[0] ?? null;

	const startOfYear = new Date(now.getFullYear(), 0, 1);
	const totalPaidThisYear = transactions
		.filter(
			(t) =>
				t.amountType === "credit" &&
				t.type === "rent" &&
				new Date(t.date) >= startOfYear,
		)
		.reduce((sum, t) => sum + t.amount, 0);

	// Accrual-based outstanding rent balance:
	// only rent credits offset the monthly rent obligation
	const moveIn = new Date(tenant.moveInDate);
	const monthsElapsed =
		(now.getFullYear() - moveIn.getFullYear()) * 12 +
		(now.getMonth() - moveIn.getMonth()) +
		1;
	const totalAccrued = Math.max(0, monthsElapsed) * monthlyRent;
	const totalRentPaid = transactions
		.filter((t) => t.amountType === "credit" && t.type === "rent")
		.reduce((sum, t) => sum + t.amount, 0);
	const outstandingBalance = Math.max(0, totalAccrued - totalRentPaid);

	const dueDate = new Date(now.getFullYear(), now.getMonth(), rentDueDay);
	const overdueStatus = now > dueDate && outstandingBalance > 0;
	const overdueDays = overdueStatus
		? Math.floor(
				(now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
			)
		: 0;

	// Running balance per transaction
	let running = 0;
	const txWithBalance = [...transactions]
		.reverse()
		.map((t) => {
			running += t.amountType === "credit" ? -t.amount : t.amount;
			return { ...t, runningBalance: running };
		})
		.reverse();

	// 12-block payment history: 6 past months + 6 upcoming months (current month = upcoming)
	const MONTH_ABBR = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const paymentHistory = Array.from({ length: 12 }, (_, i) => {
		// i=0 → 6 months ago, i=5 → last month, i=6 → current month, i=11 → 5 months ahead
		const offset = i - 6;
		const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
		const year = d.getFullYear();
		const month = d.getMonth();
		const mm = String(month + 1).padStart(2, "0");

		// Current month and future months are always "upcoming"
		if (offset >= 0) {
			return {
				_id: `ph-${year}-${mm}`,
				month: MONTH_ABBR[month],
				status: "upcoming" as const,
			};
		}

		// Past months: check rent credit coverage
		const dueDayInMonth = new Date(year, month, rentDueDay);
		const covering = rentCreditTxs.find((t) => {
			if (t.periodStart && t.periodEnd) {
				return (
					new Date(t.periodStart) <= dueDayInMonth &&
					new Date(t.periodEnd) >= dueDayInMonth
				);
			}
			// Legacy: match by calendar month
			const txDate = new Date(t.date);
			return txDate.getFullYear() === year && txDate.getMonth() === month;
		});

		let status: "paid" | "late" | "overdue";
		if (covering) {
			status = new Date(covering.date) <= dueDayInMonth ? "paid" : "late";
		} else {
			status = "overdue";
		}

		return { _id: `ph-${year}-${mm}`, month: MONTH_ABBR[month], status };
	});

	// Payment delays for reliability score
	const delays = rentCreditTxs.map((t) => {
		const paidDate = new Date(t.date);
		const due = new Date(
			paidDate.getFullYear(),
			paidDate.getMonth(),
			rentDueDay,
		);
		return Math.max(
			0,
			Math.floor(
				(paidDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
			),
		);
	});

	const avgPaymentDelay =
		delays.length > 0
			? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
			: 0;
	const reliabilityScore = Math.max(
		0,
		Math.min(100, 100 - avgPaymentDelay * 5),
	);

	// Tenancy duration: calendar diff between moveInDate and leaseExpiry
	const tenancyDuration = computeTenancyDuration(
		tenant.moveInDate,
		tenant.leaseExpiry,
	);

	// Recent activity from last 5 transactions
	const recentActivity = transactions.slice(0, 5).map((t) => ({
		_id: t.id,
		label:
			t.type === "rent"
				? t.amountType === "credit"
					? "Rent Payment Received"
					: "Rent Charge"
				: t.description,
		detail: `₦${t.amount.toLocaleString()}`,
		date: t.date,
		type:
			t.amountType === "credit"
				? ("success" as const)
				: t.type === "maintenance"
					? ("info" as const)
					: ("warning" as const),
	}));

	const result = {
		...tenant,
		property,
		unit,
		monthlyRent,
		rentDueDay,
		nextDueDate,
		tenancyDuration,
		lastPaymentAmount: lastCreditTx?.amount ?? null,
		lastPaymentDate: lastCreditTx?.date ?? null,
		overdueStatus,
		overdueDays,
		transactions: txWithBalance,
		paymentHistory,
		recentActivity,
		paymentStats: {
			reliabilityScore,
			avgPaymentDelay,
			totalPaidThisYear,
			outstandingBalance: Math.max(0, outstandingBalance),
		},
	};

	await redisUpdateKeyString(query, result, true, 2 * 60);
	return result;
}

function computeTenancyDuration(
	moveInDate: Date | undefined,
	leaseExpiry: Date | undefined,
): string {
	if (!moveInDate || !leaseExpiry) return "Ongoing";

	const start = new Date(moveInDate);
	const end = new Date(leaseExpiry);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
		return "Ongoing";
	if (end <= start) return "";

	let years = end.getFullYear() - start.getFullYear();
	let months = end.getMonth() - start.getMonth();
	let days = end.getDate() - start.getDate();

	if (days < 0) {
		// Borrow days from previous month
		months -= 1;
		const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
		days += prevMonth.getDate();
	}
	if (months < 0) {
		years -= 1;
		months += 12;
	}

	const parts: string[] = [];
	if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
	if (months > 0)
		parts.push(`${months} ${months === 1 ? "month" : "months"}`);
	if (days > 0 && years === 0) {
		parts.push(`${days} ${days === 1 ? "day" : "days"}`);
	}

	return parts.length > 0 ? parts.join(", ") : "0 days";
}
