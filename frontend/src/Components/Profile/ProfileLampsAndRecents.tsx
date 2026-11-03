import { ClearType } from "../../util/enums";
import { cn } from "../../util/helpers";
import type { Match } from "../../util/NetworkModels";
import ForegroundCard from "../General/ForegroundCard";

interface ProfileLampsAndRecents {
    className?: string;
    matches: Match[]
    lamps: Record<string, number>;
}

const LAMP_ORDER = [
    "ASSIST CLEAR",
    "EASY CLEAR",
    "CLEAR",
    "HARD CLEAR",
    "EX HARD CLEAR",
    "FULL COMBO"
]

export const LAMP_COLORS: Record<ClearType, string> = {
  [ClearType.ASSIST_CLEAR]: "#8B5CF6",
  [ClearType.EASY_CLEAR]: "#4ADE80",
  [ClearType.CLEAR]: "#60A5FA",
  [ClearType.HARD_CLEAR]: "#F4F4F5",
  [ClearType.EX_HARD_CLEAR]: "#FACC15",
  [ClearType.FULL_COMBO]: "#22D3EE",
};

export const LAMP_LABELS: Record<ClearType, string> = {
  [ClearType.ASSIST_CLEAR]: "Assist",
  [ClearType.EASY_CLEAR]: "Easy",
  [ClearType.CLEAR]: "Clear",
  [ClearType.HARD_CLEAR]: "Hard",
  [ClearType.EX_HARD_CLEAR]: "EX Hard",
  [ClearType.FULL_COMBO]: "Full Combo",
};

export default function ProfileLampsAndRecents({ className, matches, lamps }: ProfileLampsAndRecents) {

    const total = Object.values(lamps).reduce((sum, n) => sum + n, 0);

    return (
        <ForegroundCard className={cn("flex flex-col gap-7", className)} >
            <p className="font-archivo tracking-[0.2em] text-subtext">LAMPS</p>

            <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-zinc-800">
                {
                    LAMP_ORDER.map(lamp => {
                        const count = lamps[lamp] ?? 0;
                        if (count === 0) return null;

                        return (
                        
                            <div 
                            style={{
                                width: `${(count / total) * 100}%`,
                                backgroundColor: LAMP_COLORS[lamp as ClearType]
                            }}
                            />  
                            
                        )
                    })
                }
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-4 gap-y-5">
                {Object.values(ClearType).map(lamp => (
                    <div key={lamp} className="flex items-center gap-2 font-sanchez text-sm text-subtext">
                        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: LAMP_COLORS[lamp] }}/>
                        <span className="flex-1">{LAMP_LABELS[lamp]}</span>
                        <span className="font-mono">{lamps[lamp]}</span>
                    </div>
                ))}
            </div>

            <hr className="text-zinc-500/50" />

            <div className="flex flex-col gap-5">
                <p className="text-subtext font-archivo tracking-[0.2em]">RECENT FORM</p>
                <div className="flex flex-wrap gap-3">
                    {matches.map(match => {
                    return (
                        <span
                        key={match.id}
                        className={`size-8 flex items-center justify-center rounded-[5px] text-sm border font-mono font-bold ${
                            match.result === "win"
                            ? "border-green-400 bg-green-400/15 text-green-400"
                            : "border-red-400 bg-red-400/10 text-red-400"
                        }`}
                        >
                        {match.result === "win" ? "W" : "L"}
                        </span>
                    );
                    })}
                </div>
            </div>

        </ForegroundCard>
    )
}