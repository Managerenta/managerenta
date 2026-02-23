"use client";
import { memo, useMemo, useState } from "react";
import { FiGrid, FiList, FiSearch } from "react-icons/fi";
import { Box, Button, Input } from "@/components";
import { usePropertiesData } from "@/hooks";
import { PropertiesFilterStyled } from "./styled";

function PropertiesFilter() {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const { filterOptions, sortOptions } = usePropertiesData();

	const renderedFilterOptions = useMemo(() => {
		return filterOptions.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, [filterOptions]);

	const renderedSortOptions = useMemo(() => {
		return sortOptions.map(({ id, label, value }) => (
			<option key={id} value={value}>
				{label}
			</option>
		));
	}, [sortOptions]);

	return (
		<PropertiesFilterStyled>
			<Box className="left-filters">
				<select className="filter-dropdown" defaultValue="all">
					{renderedFilterOptions}
				</select>

				<Box className="search-bar">
					<FiSearch size={16} />
					<Input type="text" placeholder="Search properties..." />
				</Box>
			</Box>

			<Box className="right-filters">
				<select className="sort-dropdown" defaultValue="name">
					{renderedSortOptions}
				</select>

				<Box className="view-toggle">
					<Box
						className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
					>
						<Button
							type="button"
							title={<FiGrid size={18} />}
							handleClick={() => setViewMode("grid")}
						/>
					</Box>
					<Box
						className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
					>
						<Button
							type="button"
							title={<FiList size={18} />}
							handleClick={() => setViewMode("list")}
						/>
					</Box>
				</Box>
			</Box>
		</PropertiesFilterStyled>
	);
}

export default memo(PropertiesFilter);
