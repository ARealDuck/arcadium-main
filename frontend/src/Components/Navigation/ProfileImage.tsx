import { useState } from "react";

type ProfileImageProps = {
    displayName?: string;
    src?: string | null;
    className?: string;
}

export default function ProfileImage({ displayName, src, className = "size-10"}: ProfileImageProps) {
    const [failed, setFailed] = useState(false);

    const fallback = `https://ui-avatars.com/api/?name=${displayName}&background=a855f7&color=fff`;
    console.log(fallback)
    const imageUrl = src && !failed ? src : fallback;

    return (
        <img
        src={imageUrl}
        alt={`${displayName}'s avatar`}
        onError={() => setFailed(true)}
        className={`rounded-lg object-cover bg-surface border border-border ${className}`}
        />
    );
}