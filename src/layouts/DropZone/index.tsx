"use client";
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { type JSX, memo, useCallback, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useDragZone } from "@/hooks";
import { Box } from "../../components";

interface IProps {
	elem: JSX.Element;
	mimeTypes: string[];
	maxFiles?: number;
	isFolder?: boolean;
}

const DropZone = ({
	elem,
	mimeTypes,
	maxFiles = 1,
	isFolder = false,
}: IProps) => {
	const { handleFileUpload, clearPreviousFiles } = useDragZone();

	const onDrop = useCallback(
		(files: Blob[]): void => handleFileUpload(files),
		[handleFileUpload],
	);

	const acceptedTypes = useMemo((): {
		[key: string]: string[];
	} => {
		const values: { [key: string]: string[] } = {};
		for (const mime of mimeTypes) {
			values[mime] = [];
		}
		return values;
	}, [mimeTypes]);

	const { getRootProps, getInputProps } = useDropzone({
		onDrop,
		maxFiles,
		accept: acceptedTypes,
	});

	useEffect(() => {
		clearPreviousFiles();
	}, [clearPreviousFiles]);

	return (
		<Box {...getRootProps()}>
			{!isFolder && <input {...getInputProps()} />}

			{/* @ts-expect-error */}
			{isFolder && <input {...getInputProps()} webkitdirectory="" />}
			{elem}
		</Box>
	);
};

export default memo(DropZone);
