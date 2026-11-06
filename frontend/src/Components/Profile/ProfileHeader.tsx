import { timeSince } from "../../util/helpers";

interface ProfileHeaderProps {
    displayName: string;
    date: string;
    avatarUrl: string | null;
}

export default function ProfileHeader({ displayName, date, avatarUrl } : ProfileHeaderProps) {
    const convertDateToString = () => {
        const joined = new Date(date);

        return joined.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    }

    return (
        <div className="flex flex-row items-center gap-5 bg-zinc-800/20 p-2 border border-zinc-600/50">
            <div>
                <img
                src={avatarUrl ?? `https://ui-avatars.com/api/?name=${displayName}&background=a855f7&color=fff`}
                alt="User's avatar"
                className="size-24 shrink-0 rounded-lg object-cover bg-surface border border-border"
                />
            </div>
            <div>
                <p className="font-archivo text-lg uppercase text-subtext tracking-[0.2em]">Player Profile</p>
                <p className="font-sanchez text-4xl mt-2 tracking-wide">{displayName}</p>
                <p className="font-sanchez text-sm mt-2 text-subtext">Joined {convertDateToString()} &middot; {timeSince(date)}</p>
            </div>

        </div>
    )
}