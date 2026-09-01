/** Allowed data-room upload types (matches in-app UploadZone copy). */
export const DATA_ROOM_ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "xlsx",
  "pptx",
  "png",
  "jpg",
  "jpeg",
  "mp4",
]);

export const DATA_ROOM_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "video/mp4",
]);

export function extensionFromFileName(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}

export function validateDataRoomUploadFile(
  fileName: string,
  mimeType: string,
): { ok: true; mimeType: string } | { ok: false; error: string } {
  const ext = extensionFromFileName(fileName);
  if (!ext || !DATA_ROOM_ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: "File type not allowed. Use PDF, DOCX, XLSX, PPTX, PNG, JPG, or MP4.",
    };
  }
  const mime = mimeType.trim().toLowerCase() || guessMimeFromExtension(ext);
  if (!DATA_ROOM_ALLOWED_MIME_TYPES.has(mime)) {
    return {
      ok: false,
      error: "MIME type not allowed for data room uploads.",
    };
  }
  return { ok: true, mimeType: mime };
}

function guessMimeFromExtension(ext: string): string {
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "mp4":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}
