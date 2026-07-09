"use client";
import { memo, useCallback, useMemo, useState } from "react";
import {
	FiEdit2,
	FiMail,
	FiPhone,
	FiPlus,
	FiStar,
	FiTrash2,
} from "react-icons/fi";
import { Box, Button, Input, Select, Text } from "@/components";
import { api, getErrorMessage } from "@/constants";
import { useToast, useVendors } from "@/hooks";
import type { IVendor } from "@/types";
import { Badge, EntityPageStyled, Modal, StatCard } from "../shared/entity";
import {
	specialtyFilterOptions,
	specialtyOptions,
	titleCase,
} from "../shared/options";

interface IForm {
	name: string;
	company: string;
	specialty: string;
	phone: string;
	email: string;
	address: string;
	notes: string;
	rating: string;
}

const EMPTY: IForm = {
	name: "",
	company: "",
	specialty: "",
	phone: "",
	email: "",
	address: "",
	notes: "",
	rating: "",
};

function VendorsWrapper() {
	const toast = useToast();
	const [search, setSearch] = useState("");
	const [specialtyFilter, setSpecialtyFilter] = useState("all");
	const [modalOpen, setModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<IForm>(EMPTY);
	const [submitting, setSubmitting] = useState(false);

	const { vendors, total, isLoading, mutate } = useVendors({
		search,
		specialty: specialtyFilter,
	});

	const avgRating = useMemo(() => {
		const rated = vendors.filter((v) => typeof v.rating === "number");
		if (!rated.length) return "—";
		const sum = rated.reduce((a, v) => a + (v.rating ?? 0), 0);
		return (sum / rated.length).toFixed(1);
	}, [vendors]);

	const set = useCallback(
		(k: keyof IForm) => (v: string) => setForm((p) => ({ ...p, [k]: v })),
		[],
	);

	const openCreate = useCallback(() => {
		setEditingId(null);
		setForm(EMPTY);
		setModalOpen(true);
	}, []);

	const openEdit = useCallback((v: IVendor) => {
		setEditingId(v.id);
		setForm({
			name: v.name,
			company: v.company ?? "",
			specialty: v.specialty,
			phone: v.phone ?? "",
			email: v.email ?? "",
			address: v.address ?? "",
			notes: v.notes ?? "",
			rating: v.rating != null ? String(v.rating) : "",
		});
		setModalOpen(true);
	}, []);

	const handleSubmit = useCallback(async () => {
		if (!form.name.trim() || !form.specialty) {
			toast.push("Name and specialty are required", { type: "warn" });
			return;
		}
		setSubmitting(true);
		try {
			const payload: Record<string, unknown> = {
				name: form.name.trim(),
				specialty: form.specialty,
			};
			if (form.company.trim()) payload.company = form.company.trim();
			if (form.phone.trim()) payload.phone = form.phone.trim();
			if (form.email.trim()) payload.email = form.email.trim();
			if (form.address.trim()) payload.address = form.address.trim();
			if (form.notes.trim()) payload.notes = form.notes.trim();
			if (form.rating.trim()) payload.rating = Number(form.rating);

			if (editingId) {
				await api().patch(`/api/vendors/${editingId}`, payload);
				toast.push("Vendor updated", { type: "success" });
			} else {
				await api().post("/api/vendors", payload);
				toast.push("Vendor added", { type: "success" });
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
				await api().delete(`/api/vendors/${id}`);
				toast.push("Vendor deleted", { type: "success" });
				await mutate();
			} catch (err) {
				toast.push(getErrorMessage(err), { type: "warn" });
			}
		},
		[toast, mutate],
	);

	const rows = useMemo(
		() =>
			vendors.map((v) => (
				<tr key={v.id}>
					<td>
						<Text style={{ fontWeight: 600 }}>{v.name}</Text>
						{v.company ? (
							<Text
								style={{
									fontSize: 12,
									color: "var(--Text-Secondary)",
								}}
							>
								{v.company}
							</Text>
						) : null}
					</td>
					<td>
						<Badge>{titleCase(v.specialty)}</Badge>
					</td>
					<td>
						<Box
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 2,
							}}
						>
							{v.phone ? (
								<Text
									style={{
										fontSize: 13,
										display: "flex",
										alignItems: "center",
										gap: 6,
									}}
								>
									<FiPhone size={12} /> {v.phone}
								</Text>
							) : null}
							{v.email ? (
								<Text
									style={{
										fontSize: 13,
										display: "flex",
										alignItems: "center",
										gap: 6,
									}}
								>
									<FiMail size={12} /> {v.email}
								</Text>
							) : null}
							{!v.phone && !v.email ? "—" : null}
						</Box>
					</td>
					<td>
						{v.rating != null ? (
							<Text
								style={{
									display: "flex",
									alignItems: "center",
									gap: 4,
								}}
							>
								<FiStar size={14} color="#B45309" />
								{v.rating.toFixed(1)}
							</Text>
						) : (
							"—"
						)}
					</td>
					<td>
						<Box className="row-actions">
							<Box
								className="icon-btn"
								onClick={() => openEdit(v)}
							>
								<FiEdit2 size={15} />
							</Box>
							<Box
								className="icon-btn danger"
								onClick={() => handleDelete(v.id)}
							>
								<FiTrash2 size={15} />
							</Box>
						</Box>
					</td>
				</tr>
			)),
		[vendors, openEdit, handleDelete],
	);

	return (
		<EntityPageStyled>
			<Box className="page-head">
				<Box className="titles">
					<Text className="title">Vendors</Text>
					<Text className="subtitle">
						Your directory of contractors and service providers.
					</Text>
				</Box>
				<Button
					title="Add Vendor"
					leadingIcon={<FiPlus size={16} />}
					handleClick={openCreate}
				/>
			</Box>

			<Box className="stat-grid">
				<StatCard label="Total Vendors" value={total} />
				<StatCard label="Avg. Rating" value={avgRating} />
			</Box>

			<Box className="toolbar">
				<Input
					className="search"
					placeholder="Search vendors…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				<Box className="filter">
					<Select
						options={specialtyFilterOptions}
						value={specialtyFilter}
						onChange={setSpecialtyFilter}
						isSearchable={false}
						placeholder="Specialty"
					/>
				</Box>
			</Box>

			<Box className="panel">
				<Box className="table-scroll">
					<table>
						<thead>
							<tr>
								<th>Vendor</th>
								<th>Specialty</th>
								<th>Contact</th>
								<th>Rating</th>
								<th />
							</tr>
						</thead>
						<tbody>{rows}</tbody>
					</table>
				</Box>
				{!isLoading && vendors.length === 0 ? (
					<Box className="empty">
						No vendors yet. Add your first one.
					</Box>
				) : null}
			</Box>

			{modalOpen ? (
				<Modal
					title={editingId ? "Edit Vendor" : "Add Vendor"}
					onClose={() => setModalOpen(false)}
					footer={
						<>
							<Button
								title="Cancel"
								variant="ghost"
								handleClick={() => setModalOpen(false)}
							/>
							<Button
								title={
									editingId ? "Save Changes" : "Add Vendor"
								}
								handleClick={handleSubmit}
								disabled={submitting}
							/>
						</>
					}
				>
					<Box className="field">
						<Text className="field-label">
							Name<span className="req">*</span>
						</Text>
						<Input
							value={form.name}
							onChange={(e) => set("name")(e.target.value)}
							placeholder="Contact / business name"
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">Company</Text>
						<Input
							value={form.company}
							onChange={(e) => set("company")(e.target.value)}
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">
							Specialty<span className="req">*</span>
						</Text>
						<Select
							options={specialtyOptions}
							value={form.specialty}
							onChange={set("specialty")}
							placeholder="Select specialty"
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">Rating (0–5)</Text>
						<Input
							type="number"
							min="0"
							max="5"
							step="0.1"
							value={form.rating}
							onChange={(e) => set("rating")(e.target.value)}
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">Phone</Text>
						<Input
							value={form.phone}
							onChange={(e) => set("phone")(e.target.value)}
						/>
					</Box>
					<Box className="field">
						<Text className="field-label">Email</Text>
						<Input
							type="email"
							value={form.email}
							onChange={(e) => set("email")(e.target.value)}
						/>
					</Box>
					<Box className="field full">
						<Text className="field-label">Address</Text>
						<Input
							value={form.address}
							onChange={(e) => set("address")(e.target.value)}
						/>
					</Box>
					<Box className="field full">
						<Text className="field-label">Notes</Text>
						<textarea
							rows={2}
							value={form.notes}
							onChange={(e) => set("notes")(e.target.value)}
						/>
					</Box>
				</Modal>
			) : null}
		</EntityPageStyled>
	);
}

export default memo(VendorsWrapper);
