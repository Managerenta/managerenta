"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";
import { Box, Select } from "@/components";
import { useTenantsData } from "@/hooks";
import { Pagination } from "@/layouts";
import { TenantsFilter, TenantsGrid, TenantsHeader } from "./components";
import { TenantsWrapperStyled } from "./styled";

function TenantsWrapper() {
	const router = useRouter();
	const [offset, setOffset] = useState<number>(0);
	const [pageSize, setPageSize] = useState<number>(12);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");
	const [sortBy, setSortBy] = useState("name");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

	const handleViewModeChange = useCallback((mode: "grid" | "list") => {
		setViewMode(mode);
	}, []);

	const { tenants, stats, filterOptions, sortOptions, isLoading, total } =
		useTenantsData(pageSize, offset, filterStatus, search, sortBy);

	const handleAddTenant = useCallback(() => {
		router.push("/tenants/new");
	}, [router]);

	const totalPages = useMemo<number>(() => {
		return Math.ceil((total || 1) / pageSize);
	}, [total, pageSize]);

	return (
		<TenantsWrapperStyled>
			<TenantsHeader
				stats={stats}
				isLoading={isLoading}
				onAddTenant={handleAddTenant}
			/>
			<TenantsFilter
				search={search}
				onSearchChange={setSearch}
				filterStatus={filterStatus}
				onFilterChange={(v) => {
					setFilterStatus(v);
					setOffset(0);
				}}
				sortBy={sortBy}
				onSortChange={setSortBy}
				filterOptions={filterOptions}
				sortOptions={sortOptions}
				viewMode={viewMode}
				onViewModeChange={handleViewModeChange}
			/>
			<TenantsGrid
				tenants={tenants}
				isLoading={isLoading}
				viewMode={viewMode}
			/>

			<Box className="pagination-footer">
				<Box className="items-per-page">
					<span>Items per page:</span>
					<Select
						className="page-size"
						isSearchable={false}
						options={[
							{ label: "6", value: "6" },
							{ label: "12", value: "12" },
							{ label: "24", value: "24" },
						]}
						value={String(pageSize)}
						onChange={(v) => {
							setPageSize(Number(v));
							setOffset(0);
						}}
					/>
				</Box>

				<Pagination
					totalPages={totalPages}
					pageSize={pageSize}
					offset={offset}
					setOffset={setOffset}
				/>

				<Box className="showing-info">
					Showing {offset + 1}-{Math.min(offset + pageSize, total)} of{" "}
					{total} tenants
				</Box>
			</Box>
		</TenantsWrapperStyled>
	);
}

export default memo(TenantsWrapper);
