import { Link } from "react-router";
import type { Invite } from "../../util/NetworkModels"
import { Copy } from "lucide-react";

interface InviteListProps {
    invites: Invite[]
}

export default function InviteList({ invites }: InviteListProps) {
    const formatDate = (iso: string) => 
        new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })

    const copyLink = (code: string) =>
        navigator.clipboard.writeText(`${window.location.origin}/register?invite=${code}`)

    return (
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4">
            {invites.map((invite) => {
                const used = invite.used_by_id !== null;

                return (
                    <div
                    key={invite.code}
                    className="col-span-4 grid grid-cols-subgrid items-center min-h-16 border-t border-zinc-800"
                    >
                        <span className={`font-mono font-bold truncate ${used ? "text-zinc-500 line-through" : ""}`}>
                            {invite.code}
                        </span>

                        {used ? (
                            <span className="text-xs bg-zinc-800 px-2 py-1 rounded-full justify-self-end">
                                Used by <Link className="text-highlight/90 underline" to={`/profile/${invite.used_by_id}`}>{invite.used_by_name}</Link>
                            </span>
                        ) : (
                            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full justify-self-end">
                                Available
                            </span>
                        )}

                        <span className="text-xs text-zinc-400">
                            {formatDate(invite.used_at ?? invite.created_at)}
                        </span>

                        {used ? (
                            <span />
                        ) : (
                            <button onClick={() => copyLink(invite.code)} className="flex flex-row items-center text-sm gap-2 border border-zinc-400/50 p-2 rounded-md hover:bg-zinc-500/50 cursor-pointer duration-150">
                                <Copy className="size-4"/> Copy Link
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}