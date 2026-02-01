export interface IUploadFile {
	id: string | number;
	name: string;
	buffer: ArrayBuffer;
	type: string;
}
