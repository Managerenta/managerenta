"use client";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { v4 as uuid } from "uuid";
import type { IUploadFile } from "@/types";

const useDragZone = () => {
	const [uploadedFiles, setUploadFiles] = useState<IUploadFile[]>([]);

	const clearPreviousFiles = useCallback(() => setUploadFiles?.([]), []);

	const handleFileUpload = useCallback((files: Blob[]): void => {
		for (const file of files) {
			const reader = new FileReader();

			reader.onabort = () => {
				toast.warn("file upload aborted", {
					className: "file-upload-aborted",
				});
			};
			reader.onerror = () => {
				toast.error("file upload failed", {
					className: "file-upload-error",
				});
			};
			reader.onload = () => {
				const buffer = reader.result as ArrayBuffer;

				const uploadedFile: IUploadFile = {
					id: uuid(),
					name: uuid(),
					type: file.type,
					buffer,
				};

				if (setUploadFiles)
					setUploadFiles((files) => [...files, uploadedFile]);
			};
			reader.readAsArrayBuffer(file);
		}
	}, []);

	return {
		clearPreviousFiles,
		handleFileUpload,
		uploadedFiles,
	};
};

export default useDragZone;
