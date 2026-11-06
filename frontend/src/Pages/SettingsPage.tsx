import { useState } from "react"
import { useAuth } from "../hooks/useAuth";
import { api } from "../util/helpers";
import type { User } from "../util/NetworkModels";
import { Button } from "@headlessui/react";
import ForegroundCard from "../Components/General/ForegroundCard";

export default function SettingsPage() {

    const { setUser } = useAuth();

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    const [uploading, setUploading] = useState<boolean>(false);
    const [error, setError] = useState<string>();

    function pick(f: File | undefined) {
        if (!f || !f.type.startsWith("image/")) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
    }

    async function uploadAvatar(f: File) {
        const form = new FormData();
        form.append("file", f);

        setUploading(true)
        setError(undefined);

        try {
            const updated = await api<User>("/auth/me/avatar", { method: "POST", body: form })
            setUser(updated)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed")
        } finally {
            setUploading(false);
        }

    }

    return (
        <div className="flex flex-col w-7/8 lg:w-1/2 mx-auto">
            <p className="font-archivo text-subtext tracking-[0.2em] text-xl mt-2">Settings</p>

            <ForegroundCard className="mt-5">
                <p className="mb-2 font-sanchez text-lg">Profile Picture</p>
                <label
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]) }}
                className={`lg:w-100 mx-auto flex flex-col items-center justify-center gap-2 aspect-square rounded-lg border-2 border-dashed cursor-pointer duration-150
                    ${dragging ? "border-highlight bg-highlight/10" : "border-zinc-600 hover:border-zinc-400"}`}
                >
                    {preview
                    ? <img src={preview} alt="Preview" className="max-h-full object-contain" />
                    : <span className="text-subtext">Drop an image or click to choose</span>
                    }
                    <input type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0] )} />
                </label>
                <Button onClick={file ? () => uploadAvatar(file) : undefined} className="self-end font-sanchez flex items-center gap-2 bg-highlight brightness-80 hover:brightness-100 duration-200 cursor-pointer p-3 rounded-sm font-semibold">Upload</Button>
            </ForegroundCard>

        </div>
    )
}