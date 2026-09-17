import { useEffect, useState } from "react";

export interface PhotoUpload {
  file: File | null;
  previewUrl: string | null;
  handleChange: (file: File | null) => void;
}

// One before/after photo picker slot: the selected File plus a blob: preview URL. Call
// once per slot (SessionDetailsPanel uses this twice, for beforePhoto and afterPhoto).
// Revokes the old preview synchronously on each swap in handleChange, and revokes
// whatever's still set on unmount -- e.g. the colorist switches away (or the parent
// calculator remounts) before ever saving.
export function usePhotoUpload(): PhotoUpload {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleChange = (nextFile: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
  };

  return { file, previewUrl, handleChange };
}
