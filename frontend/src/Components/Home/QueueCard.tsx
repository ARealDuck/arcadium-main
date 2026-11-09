import { useAuth } from "../../hooks/useAuth";

import { useRank } from "../../hooks/useTiers";
import type { Tier, UserRating } from "../../util/NetworkModels";
import { toFixedTruncated, toRoman, winRate } from "../../util/helpers";
import ProgressBar from "../General/ProgressBar";

interface QueueCardProps {
    rating: UserRating;
    placed?: boolean;
    tiers: Tier[],
    displayProgress?: boolean;
    displayRating?: boolean;
}

interface QueueIconProps {
    rating?: number;
    tierName?: string;
    placed?: boolean;
    displayProgress?: boolean;
    displayRating?: boolean
}

export function QueueIcon(props: QueueIconProps) {

    const rank = useRank(props.rating ?? 0, props.placed);

    if (!rank)
        return (
        <div>Loading...</div>
    )


    return (
    <div className="w-full flex items-center h-ful flex-col gap-4">
        {/* <div className="h-32 flex items-end justify-center">
            {
                rank.ranked || props.tierName ?
                <img className="h-28 w-auto shrink-0 object-contain [image-rendering:pixelated]" src={props.rating ? returnIcon(rank.tier.name) : returnIcon(props.tierName ?? "Unranked")}/> :
                <img className="h-28 w-auto shrink-0 object-contain [image-rendering:pixelated]" src={returnIcon("Unranked")}/>
            }

        </div> */}
        <div className="font-archivo items-center font-light text-xl tracking-widest">
            {
                props.tierName
                ? props.tierName
                : rank.ranked
                    ? `${rank.tier.name} ${rank.progress?.division ? toRoman(rank.progress.division) : ""}`
                    : "Unranked"
            }
        </div>
        {
            props.rating && props.displayRating && rank.ranked ? (
            <div className="font-mono text-xl font-extrabold flex items-center gap-3">
                {toFixedTruncated(props.rating, 0)} <span className="text-subtext font-light text-[15px]">≈ {rank.siegRating.symbol} {rank.siegRating.level.toFixed(2)}</span>
            </div>
            ): (<></>)
        }
        
            {
                props.displayProgress && rank.ranked ?
                <div className="w-full">
                    <ProgressBar
                    value={rank.progress?.percent ?? 0}
                    className="bg-highlight w-full" 
                    durationMs={0}
                    animate={false}
                    />
                    <div className="font-sanchez flex flex-row justify-between text-subtext mt-2 text-sm">
                        <p>{rank.progress?.start}</p>
                        <p>{rank.next?.at}</p>
                    </div> 
                    </div>
                    : (<></>)

            }
    </div>
    )

}

export default function QueueCard(props: QueueCardProps) {
    const { loading } = useAuth();
    
    return loading ? (
        <></>
    ) : (
        <>
            <div className="w-full lg:w-1/4 bg-background-dark p-5 rounded-md flex flex-col">
                <p className="uppercase font-archivo text-center font-light text-2xl tracking-widest mb-8">
                    {props.rating.ladder == "ec" ? "BMS Easy Clear Ladder" : "BMS Hard Clear Ladder"}
                </p>

                <div className="flex flex-row justify-center items-center">
                    <QueueIcon 
                    rating={props.rating.display_rating}
                    placed={props.placed}
                    displayProgress={props.displayProgress}
                    displayRating={props.displayRating}
                    />

                    <div className="flex-1 flex flex-col gap-4 justify-center h-full items-center">
                        <div className="text-center flex flex-col gap-1">
                            <p className="text-xs uppercase tracking-widest text-subtext">Rating</p>
                            <p className="text-3xl font-bold tabular-nums">
                                { props.rating.display_rating !== -1 ?
                                props.rating.display_rating.toFixed(0) :
                                "---"
                                }
                                </p>
                            {
                                props.rating.display_rating !== -1 ?
                                <p className="text-xs text-subtext">#{props.rating.rank} of {props.rating.total}</p> : ""
                            }
                            
                        </div>
                        <div className="text-center flex flex-col gap-1">
                            <p className="text-xs uppercase tracking-widest text-subtext">Record</p>
                            <p className="text-xl font-bold tabular-nums">
                            <span className="text-green-600">{props.rating.wins}W</span> · <span className="text-red-600">{props.rating.losses}L</span>
                            </p>
                            {
                                props.rating.total !== 0 ?
                                <p className="text-xs text-subtext">{winRate(props.rating.wins, props.rating.losses)?.toFixed(2)}% win rate</p> :
                                <p className="text-xs text-subtext">0% win rate</p>             

                            }

                        </div>
                    </div>
                </div>

            <div className="flex flex-row justify-end gap-5 mt-5">
                {/* <div className="">
                    <Button className="font-sanchez inline-flex items-center gap-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 duration-200 cursor-pointer p-3 rounded-sm font-semibold">Queue Casual <CircleArrowOutUpRight className="size-4 font-bold"/></Button>
                </div>

                <div className="text-right">
                    <Button onClick={() => handleQueue(MatchType.COMPETITIVE)} className="font-sanchez inline-flex items-center gap-2 bg-highlight brightness-80 hover:brightness-100 duration-200 cursor-pointer p-3 rounded-sm font-semibold">Queue Ranked <Podium className="size-5 font-bold"/></Button>
                </div> */}
            </div>

            </div>
        </>
    )
}