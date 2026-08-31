"use client";

import { useId, useState } from "react";

type Props = {
  name: string;
  label: string;
  required?: boolean;
};

export function PhotoField({ name, label, required = true }: Props) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-black">
        {label}
        {required ? <span className="text-pink-500"> *</span> : null}
      </span>
      <div className="overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-white">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="미리보기" className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-36 flex-col items-center justify-center gap-1 px-4 text-center text-sm text-gray-400">
            <span className="text-2xl">📷</span>
            <span>카메라로 찍거나 앨범에서 고르세요</span>
          </div>
        )}
        <input
          id={id}
          name={name}
          type="file"
          accept="image/*"
          capture="environment"
          required={required}
          className="w-full cursor-pointer border-t border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              setPreview(null);
              return;
            }
            setPreview(URL.createObjectURL(file));
          }}
        />
      </div>
    </label>
  );
}
