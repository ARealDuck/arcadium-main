import { cn, toFixedTruncated } from "../../util/helpers";
import ProgressBar from "../General/ProgressBar";

interface ProfileIndividualTableProgressProps {
    className?: string;
    tableIcon: string;
    tableName: string;
    games: number;
    wins: number;
}

export default function ProfileIndividualTableProgress({ className, tableIcon, tableName, games, wins }: ProfileIndividualTableProgressProps) {
    const winRate = games > 0 ? (wins / games) * 100 : 0
    
    return (
        <div className={cn("w-full flex-1 grid grid-cols-[3.5rem_1fr_2rem] items-center gap-5", className)}>
            <p className="items-center bg-zinc-800 border border-zinc-600/50 py-1 rounded-md text-center justify-center">{tableIcon}</p>
            <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                    <p className="text-sm font-sanchez text-subtext truncate max-w-[10ch] lg:max-w-none">{tableName}</p>
                    <p className="text-sm font-sanchez text-subtext"><span className="hidden lg:inline">{wins} W &middot;</span> {games} played</p>
                </div>  
                <ProgressBar
                value={winRate}
                animate={false}
                durationMs={0}
                />
            </div>
            <p className="font-mono self-stretch items-center rounded-md text-center">{toFixedTruncated(winRate, 0)}%</p>
        </div>
    )
}