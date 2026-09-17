"use client";

import { useEffect, useId, useState } from "react";

type Props = {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
};

export function PhotoField({ name, label, hint, required = true }: Props) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);

  // 미리보기 URL 메모리 해제
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-black">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {hint ? <p className="mb-1.5 text-xs text-gray-400">{hint}</p> : null}
      <div className="overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-white">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="선택한 사진 미리보기" className="h-48 w-full object-cover" />
        ) : (
          <label
            htmlFor={id}
            className="flex h-36 cursor-pointer flex-col items-center justify-center gap-1 px-4 text-center text-sm text-gray-400"
          >
            <span className="text-2xl" aria-hidden>📷</span>
            <span>카메라로 찍거나 앨범에서 고르세요</span>
          </label>
        )}
        <input
          id={id}
          name={name}
          type="file"
          accept="image/*"
          required={required}
          className="w-full cursor-pointer border-t border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
      </div>
    </div>
  );
}
