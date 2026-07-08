"use client";
import { memo } from "react";
import { FiGrid, FiList, FiSearch } from "react-icons/fi";
import { Box, Button, Input, Select } from "@/components";
import { TenantsFilterStyled } from "./styled";

interface IFilterOption {
	id: string;
	label: string;
	value: string;
}

interface IProps {
	search: string;
	onSearchChange: (value: string) => void;
	filterStatus: string;
	onFilterChange: (value: string) => void;
	sortBy: string;
	onSortChange: (value: string) => void;
	filterOptions: IFilterOption[];
	sortOptions: IFilterOption[];
	viewMode: "grid" | "list";
	onViewModeChange: (mode: "grid" | "list") => void;
}

function TenantsFilter({
	search,
	onSearchChange,
	filterStatus,
	onFilterChange,
	sortBy,
	onSortChange,
	filterOptions,
	sortOptions,
	viewMode,
	onViewModeChange,
}: IProps) {
	return (
		<TenantsFilterStyled>
			<Box className="left-filters">
				<Select
					className="filter-dropdown"
					options={filterOptions}
					value={filterStatus}
					onChange={onFilterChange}
					isSearchable={false}
				/>
				<Box className="search-bar">
					<FiSearch size={16} />
					<Input
						type="text"
						placeholder="Search tenants..."
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
					/>
				</Box>
			</Box>

			<Box className="right-filters">
				<Select
					className="sort-dropdown"
					options={sortOptions}
					value={sortBy}
					onChange={onSortChange}
					isSearchable={false}
				/>
				<Box className="view-toggle">
					<Box
						className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
					>
						<Button
							type="button"
							title={<FiGrid size={18} />}
							handleClick={() => onViewModeChange("grid")}
						/>
					</Box>
					<Box
						className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
					>
						<Button
							type="button"
							title={<FiList size={18} />}
							handleClick={() => onViewModeChange("list")}
						/>
					</Box>
				</Box>
			</Box>
		</TenantsFilterStyled>
	);
}

export default memo(TenantsFilter);
