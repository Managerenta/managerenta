"use client";
import { memo, useCallback, useMemo, useState } from "react";
import {
	FiAlertTriangle,
	FiCheckCircle,
	FiClock,
	FiEdit2,
	FiPlus,
	FiTool,
	FiTrash2,
} from "react-icons/fi";
import { Box, Button, Select, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import {
	useMaintenance,
	usePropertyOptions,
	useToast,
	useVendorOptions,
} from "@/hooks";
import type { IMaintenanceRequest } from "@/types";
import { Badge, EntityPageStyled, Modal, StatCard } from "../shared/entity";
import {
	categoryOptions,
	PRIORITY_COLORS,
	priorityFilterOptions,
	priorityOptions,
	STATUS_COLORS,
	statusFilterOptions,
	statusOptions,
	titleCase,
} from "../shared/options";

interface IForm {
	title: string;
	propertyId: string;
	category: string;
	priority: string;
	status: string;
	description: string;
	cost: string;
	scheduledDate: string;
	vendorId: string;
}

const EMPTY: IForm = {
	title: "",
	propertyId: "",
	category: "",
	priority: "medium",
	status: "open",
	description: "",
	cost: "",
	scheduledDate: "",
	vendorId: "",
};

function MaintenanceWrapper() {
	const toast = useToast();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [priorityFilter, setPriorityFilter] = useState("all");
	const [modalOpen, setModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<IForm>(EMPTY);
	const [submitting, setSubmitting] = useState(false);

	const { requests, stats, isLoading, mutate } = useMaintenance({
		search,
		status: statusFilter,
		priority: priorityFilter,
	});
	const { options: propertyOptions, nameById } = usePropertyOptions();
	const vendorOptions = useVendorOptions();

	const set = useCallback(
		(k: keyof IForm) => (v: string) => setForm((p) => ({ ...p, [k]: v })),
		[],
	);

	const openCreate = useCallback(() => {
		setEditingId(null);
		setForm(EMPTY);
		setModalOpen(true);
	}, []);

	const openEdit = useCallback((r: IMaintenanceRequest) => {
		setEditingId(r.id);
		setForm({
			title: r.title,
			propertyId: r.propertyId,
			category: r.category,
			priority: r.priority,
			status: r.status,
			description: r.description,
			cost: r.cost != null ? String(r.cost) : "",
			scheduledDate: r.scheduledDate ? r.scheduledDate.slice(0, 10) : "",
			vendorId: r.vendorId ?? "",
		});
		setModalOpen(true);
	}, []);

	const handleSubmit = useCallback(async () => {
		if (!form.title.trim() || !form.propertyId || !form.category) {
			toast.push("Title, property and category are required", {
				type: "warn",
			});
			return;
		}
		setSubmitting(true);
		try {
			const payload: Record<string, unknown> = {
				title: form.title.trim(),
				description: form.description.trim() || form.title.trim(),
				category: form.category,
				priority: form.priority,
			};
			if (form.cost.trim()) payload.cost = Number(form.cost);
			if (form.scheduledDate) payload.scheduledDate = form.scheduledDate;
			if (form.vendorId) payload.vendorId = form.vendorId;

			if (editingId) {
				payload.status = form.status;
				await api().patch(`/api/maintenance/${editingId}`, payload);
				toast.push("Request updated", { type: "success" });
			} else {
				payload.propertyId = form.propertyId;
				await api().post("/api/maintenance", payload);
				toast.push("Request created", { type: "success" });
			}
			setModalOpen(false);
			await mutate();
		} catch (err) {
			toast.push(getErrorMessage(err), { type: "warn" });
		} finally {
			setSubmitting(false);
		}
	}, [form, editingId, toast, mutate]);

	const handleDelete = useCallback(
		async (id: string) => {
			try {
				await api().delete(`/api/maintenance/${id}`);
				toast.push("Request deleted", { type: "success" });
				await mutate();
			} catch (err) {
				toast.push(getErrorMessage(err), { type: "warn" });
			}
		},
		[toast, mutate],
	);

	const rows = useMemo(
		() =>
			requests.map((r) => {
				const sc = STATUS_COLORS[r.status];
				const pc = PRIORITY_COLORS[r.priority];
				return (
					<tr key={r.id}>
						<td>
							<Text style={{ fontWeight: 600 }}>{r.title}</Text>
							<Text
								style={{
									fontSize: 12,
									color: "var(--Text-Secondary)",
								}}
							>
								{titleCase(r.category)}
							</Text>
						</td>
						<td>{nameById[r.propertyId] ?? "—"}</td>
						<td>
							<Badge $bg={pc?.bg} $fg={pc?.fg}>
								{r.priority}
							</Badge>
						</td>
						<td>
							<Badge $bg={sc?.bg} $fg={sc?.fg}>
								{titleCase(r.status)}
							</Badge>
						</td>
						<td>
							{r.cost != null
								? `₦${r.cost.toLocaleString("en-NG")}`
								: "—"}
						</td>
						<td>
							{new Date(r.createdAt).toLocaleDateString("en-NG")}
						</td>
						<td>
							<Box className="row-actions">
								<Box
									className="icon-btn"
									onClick={() => openEdit(r)}
								>
									<FiEdit2 size={15} />
								</Box>
								<Box
									className="icon-btn danger"
									onClick={() => handleDelete(r.id)}
								>
									<FiTrash2 size={15} />
								</Box>
							</Box>
						</td>
					</tr>
				);
			}),
		[requests, nameById, openEdit, handleDelete],
	);

	return (
		<EntityPageStyled>
			<Box className="page-head">
				<Box className="titles">
					<Text className="title">Maintenance</Text>
					<Text className="subtitle">
						Track repair requests across your properties.
					</Text>
				</Box>
				<Button
					title="New Request"
					leadingIcon={<FiPlus size={16} />}
					handleClick={openCreate}
				/>
			</Box>

			<Box className="stat-grid">
				<StatCard
					label="Total"
					value={stats.total}
					icon={<FiTool size={18} color="#1D4E89" />}
					iconBg="#E0ECFB"
				/>
				<StatCard
					label="Open"
					value={stats.open}
					icon={<FiAlertTriangle size={18} color="#B45309" />}
					iconBg="#FBEDE5"
				/>
				<StatCard
					label="In Progress"
					value={stats.inProgress}
					icon={<FiClock size={18} color="#1D4E89" />}
					iconBg="#E0ECFB"
				/>
				<StatCard
					label="Completed"
					value={stats.completed}
					icon={<FiCheckCircle size={18} color="#15803D" />}
					iconBg="#DCFCE7"
				/>
			</Box>

			<Box className="toolbar">
				<input
					className="search"
					placeholder="Search requests…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				<Box className="filter">
					<Select
						options={statusFilterOptions}
						value={statusFilter}
						onChange={setStatusFilter}
						isSearchable={false}
						placeholder="Status"
					/>
				</Box>
				<Box className="filter">
					<Select
						options={priorityFilterOptions}
						value={priorityFilter}
						onChange={setPriorityFilter}
						isSearchable={false}
						placeholder="Priority"
					/>
				</Box>
			</Box>

			<Box className="panel">
				<Box className="table-scroll">
					<table>
						<thead>
							<tr>
								<th>Request</th>
								<th>Property</th>
								<th>Priority</th>
								<th>Status</th>
								<th>Cost</th>
								<th>Created</th>
								<th />
							</tr>
						</thead>
						<tbody>{rows}</tbody>
					</table>
				</Box>
				{!isLoading && requests.length === 0 ? (
					<Box className="empty">
						No maintenance requests yet. Create your first one.
					</Box>
				) : null}
			</Box>

			{modalOpen ? (
				<Modal
					title={
						editingId ? "Edit Request" : "New Maintenance Request"
					}
					onClose={() => setModalOpen(false)}
					footer={
						<>
							<Button
								title="Cancel"
								variant="ghost"
								handleClick={() => setModalOpen(false)}
							/>
							<Button
								title={editingId ? "Save Changes" : "Create"}
								handleClick={handleSubmit}
								disabled={submitting}
							/>
						</>
					}
				>
					<Box className="field full">
						<Text className="field-label">
							Title<span className="req">*</span>
						</Text>
						<input
							value={form.title}
							onChange={(e) => set("title")(e.target.value)}
							placeholder="e.g. Leaking kitchen tap"
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">
							Property<span className="req">*</span>
						</Text>
						<Select
							options={propertyOptions}
							value={form.propertyId}
							onChange={set("propertyId")}
							isDisabled={!!editingId}
							placeholder="Select property"
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">
							Category<span className="req">*</span>
						</Text>
						<Select
							options={categoryOptions}
							value={form.category}
							onChange={set("category")}
							placeholder="Select category"
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">Priority</Text>
						<Select
							options={priorityOptions}
							value={form.priority}
							onChange={set("priority")}
							isSearchable={false}
						/>
					</Box>
					{editingId ? (
						<Box className="field">
							<Text className="field-label">Status</Text>
							<Select
								options={statusOptions}
								value={form.status}
								onChange={set("status")}
								isSearchable={false}
							/>
						</Box>
					) : null}
					<Box className="field">
						<Text className="field-label">Assign Vendor</Text>
						<Select
							options={vendorOptions}
							value={form.vendorId}
							onChange={set("vendorId")}
							isClearable
							placeholder="Unassigned"
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">Estimated Cost (₦)</Text>
						<input
							type="number"
							min="0"
							value={form.cost}
							onChange={(e) => set("cost")(e.target.value)}
							placeholder="0"
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">Scheduled Date</Text>
						<input
							type="date"
							value={form.scheduledDate}
							onChange={(e) =>
								set("scheduledDate")(e.target.value)
							}
						/>
					</Box>
					<Box className="field full">
						<Text className="field-label">Description</Text>
						<textarea
							rows={3}
							value={form.description}
							onChange={(e) => set("description")(e.target.value)}
							placeholder="Describe the issue…"
						/>
					</Box>
				</Modal>
			) : null}
		</EntityPageStyled>
	);
}

export default memo(MaintenanceWrapper);
