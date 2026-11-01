import { useNavigate, useParams } from "react-router";
import { useAuth } from "../hooks/useAuth"
import { useEffect, useState } from "react";
import { api, calculateTimeLeftPercentage, formatClock, waitForJob, waitForMatch } from "../util/helpers";
import type { Job, JobResultMatchSubmit, Match, MatchSubmit } from "../util/NetworkModels";
import { QueueIcon } from "../Components/Home/QueueCard";
import { formatTime, useCountdown } from "../hooks/useCountdown";
import { Button, MenuButton, Menu, MenuItems, MenuItem } from "@headlessui/react";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { MatchResultsDialog } from "../Components/Match/MatchResultsDialog";
import ForegroundCard from "../Components/General/ForegroundCard";
import ProgressBar from "../Components/General/ProgressBar";
import { toFixedTruncated } from "../util/helpers";
import ScoreSummary from "../Components/Match/ScoreSummary";
import { useActiveMatch } from "../hooks/useActiveMatch";

export default function MatchPage() {

    type SubmitStatus = "idle" | "submitting" | "verifying" | "done" | "error"

    const {user, loading} = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const { refreshActiveMatch } = useActiveMatch();

    const [status, setStatus] = useState<SubmitStatus>("idle");
    const [message, setMessage] = useState<string | null>(null);
    const [forfeitLoad, setForfeitLoad] = useState<boolean>(false);

    const [showWin, setShowWin] = useState<boolean>(false);
    const [matchResult, setMatchResult] = useState<string>("lose");

    const [match, setMatch] = useState<Match | null>();

    const { msLeft, finished, skipMsLeft } = useCountdown(match?.cutoff_time, match?.start_time)

    useEffect(() => {
        Promise.all([
            api<Match>(`/match/${id}`)
        ])
        .then(([match]) => {
            setMatch(match)
        })
    }, [user?.id, id])

    useEffect(() => {
        if (!finished || !match || match.status !== "active") return

        let cancelled = false;

        async function runMatchCheck() {
            if (!match) return

            const finalizedMatch = await waitForMatch(match.id)

            if (cancelled || !finalizedMatch.result)
                return;

            setShowWin(true)
            setMatchResult(finalizedMatch.result)
            setMatch(finalizedMatch);
        }

        runMatchCheck()
    }, [finished, match?.status, match?.id])

    if (loading || !match  || user == null) {
        return <div className="flex-1 flex items-center justify-center text-muted">Loading…</div>
    }

    const handleSubmit = async () => {
        setStatus("submitting")
        setMessage(null)

        try {
            const matchSubmission = await api<MatchSubmit>(
                `/match/submit`,
                { method: "POST" }
            );

            setStatus("verifying");
            const completed_job: Job<JobResultMatchSubmit> = await waitForJob<JobResultMatchSubmit>(matchSubmission.job_id);
            setStatus("done");

            if (completed_job.result)
            {
                if (completed_job.result.result != null)
                {
                    setMatchResult(completed_job.result.result)
                    
                    const finalizedMatch = await api<Match>(`/match/${id}`);

                    setMatch(finalizedMatch)
                    setShowWin(true)
                }
            }
        } catch (err) {
            setStatus("error");
            setMessage(err instanceof Error ? err.message : "Something went wrong")
        }
    }

    const handleForfeit = async () => {
        try {
            await api<Match>(`/match/forfeit`, {method: "POST"})
            
            if (!match) return

            console.log("HI!");
            setForfeitLoad(true)

            const finalizedMatch = await waitForMatch(match.id)

            if (!finalizedMatch.result)
                return;

            await refreshActiveMatch();

            setShowWin(true)
            setMatchResult(finalizedMatch.result)
            setMatch(finalizedMatch);
            setForfeitLoad(false)

        } catch (err) {
            setStatus("error");
            setMessage(err instanceof Error ? err.message : "Something went wrong")
        }
    }

    const handleSkip = async () => {
        api<Match>(`/match/skip`, {method: "POST"})
        .then(match => {
            navigate(`/match/${match.id}`)
        })
        .catch(err => console.log(err))
    }

    console.log(match)

    return (
        <div className="w-full flex-1 flex flex-col">
            {
                match.player_display_after ?             
                <MatchResultsDialog
                open={showWin}
                win={matchResult === "win" ? true : false}
                onClose={(queue: boolean) => {
                    setShowWin(false);

                    if (queue)
                        navigate(`/prep/${match.game}/${match.playtype}/${match.ladder}`)
                }}
                rating_after={match.player_display_after}
                rating_before={match.player_display_before}
                /> : <></>
            }


            <div className="flex-1 flex flex-col">
                <div className="w-full mx-auto flex-1 flex flex-col items-center justify-center">
                    <div className="w-full lg:w-5/6 xl:w-1/2 flex flex-col lg:flex-row items-center lg:justify-between mb-8 mt-5 lg:mt-0">
                        <div>
                            <div className="justify-center lg:justify-start flex flex-wrap items-center gap-x-2 gap-y-1 font-archivo text-xs tracking-[0.2em] text-subtext mb-5 lg:mb-1">
                                <span>BMS 7K</span>
                                <span>·</span>
                                <span>EASY CLEAR</span>
                                <span className="">·</span>
                                <span className="text-purple-400 uppercase">{match.type}</span>
                                </div>
                            <h1 className="text-center lg:text-left font-archivo text-5xl tracking-widest font-thin">Match #{id}</h1>
                        </div>
                        <div className="mt-5 lg:mt-0">
                            {
                                match.status == "active" ?
                                <div>
                                    <h1 className="font-mono text-center text-5xl tracking-widest font-bold mb-3 lg:text-right">{msLeft === 0 ? "Ended" : formatTime(msLeft)}</h1>
                                    {
                                        <p className="text-center font-sanchez text-subtext lg:text-right tracking-[0.2em]">{msLeft === 0 ? "Ended" : "Cutoff Time - " + formatClock(match.cutoff_time)}</p>
                                    }

                                </div> :
                                <div>
                                    {
                                        match.result == "win" ? <h1 className="font-archivo text-green-500 text-5xl tracking-widest font-bold mb-3 text-right">WIN</h1> : 
                                        <h1 className="text-center font-archivo text-red-500 text-5xl tracking-widest font-bold mb-3 lg:text-right">LOSE</h1>
                                    }

                                    {
                                        <p className="text-center font-sanchez text-subtext lg:text-right tracking-[0.2em]">{msLeft === 0 ? "Ended" : "Cutoff Time - " + formatClock(match.cutoff_time)}</p>
                                    }
                                </div>
                            }
                        </div>


                    </div>
                    <div className="xl:w-1/2 w-5/6 mb-8">
                        <ProgressBar
                        value={calculateTimeLeftPercentage(match.start_time, match.cutoff_time, msLeft)}
                        animate={true}
                        durationMs={700}
                        />
                    </div>
                    <div className="w-5/6 xl:w-1/2 grid-cols-1 grid lg:grid-cols-3 gap-6 lg:gap-10 mx-auto">
                        <ForegroundCard className="order-3 lg:order-0 text-center">
                            <p className="font-archivo font-thin tracking-[0.2em] text-subtext">YOU</p>
                            <QueueIcon
                                rating={match.player_display_before}
                                placed={match.player_placed_before}
                                displayProgress={true}
                                displayRating={true}
                            />
                        </ForegroundCard>
                        <ForegroundCard className="order-1 lg:order-0 text-center">
                            <p className="font-archivo font-thin tracking-[0.2em] text-subtext">POTENTIAL</p>   
                            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                <div className="grid grid-cols-2 divide-x divide-zinc-700/60">
                                <div className="px-8 text-center">
                                    <p className="font-mono text-5xl font-bold text-green-400">+{toFixedTruncated(match.potential_gain, 0)}</p>
                                    <p className="mt-3 text-subtext font-sanchez">Easy clear or better</p>
                                </div>
                                <div className="px-8 text-center">
                                    <p className="font-mono text-5xl font-bold text-red-400">{toFixedTruncated(match.potential_loss, 0)}</p>
                                    <p className="mt-3 text-subtext font-sanchez">No clear by cutoff</p>
                                </div>
                                </div>

                            </div>        
                        </ForegroundCard>
                        <ForegroundCard className="order-2 lg:order-0 text-center w-full">
                            <p className="font-archivo font-thin tracking-[0.2em] text-subtext">OPPONENT</p>
                            <QueueIcon
                                rating={match.chart_rating_before}
                                displayProgress={false}
                                displayRating={true}
                            />

                            <p
                            className="mt-4 line-clamp-2 wrap-break-word font-sanchez text-subtext font-bold tracking-widest w-full"
                            title={`${match.chart.title} ${match.chart.subtitle ?? ""}`}
                            >
                            {match.chart.title} {match.chart.subtitle} 
                            </p> 

                            <p className="mt-2 truncate font-sanchez text-subtext tracking-widest" title={match.chart.artist}>
                            {match.chart.artist}
                            </p>

                            <div className="flex flex-row w-full justify-center gap-3 mt-3">
                                {
                                    match.chart.table_levels.map((level) => (
                                        <p key={`${level.table_icon}${level.table_level}`} className="font-semibold bg-background px-2 py-1 rounded-xl border border-zinc-600">{level.table_icon}{level.table_level}</p>
                                    ))
                                }
                            </div>
                        </ForegroundCard>
                    </div>
                    <div className="w-5/6 xl:w-1/2 mt-5">
                        <ForegroundCard>
                            <div className="flex flex-col lg:flex-row justify-center items-center">
                                <div className="w-full flex flex-row items-center gap-5">
                                {
                                    match.score == null ? 
                                    
                                    <>
                                    <span className="size-3 rounded-full bg-yellow-500"></span>
                                    <div className="flex flex-col">
                                        <div>
                                            <p className="font-sanchez font-bold">No clear yet!</p>
                                        </div>
                                        <div>
                                            <p className="font-sanchez text-subtext">Click on <em>check scores</em> to check <em>Bokutachi</em> for recent scores!</p>
                                        </div>
                                    </div> 
                                    </> : 
                                    <div className="w-full">
                                        <ScoreSummary match={match} />
                                    </div>

                                }
                                </div>

                                <div className="w-5/6 lg:w-auto mt-3 lg:mt-auto flex flex-col lg:flex-row gap-4 shrink-0">
                                    {
                                        match.status == "active" && match.user.id == user.id ? (
                                        skipMsLeft > 0 ? <Button onClick={handleSkip} className="font-sanchez bg-foreground border border-zinc-600/80 rounded-lg p-3 font-bold hover:brightness-130 cursor-pointer duration-150">Skip &middot; <span className="text-subtext text-sm">{Math.ceil(skipMsLeft / 1000) + "s left"}</span></Button> :
                                        <Button className="font-sanchez bg-zinc-900 border border-zinc-600/80 rounded-lg p-3 font-bold cursor-not-allowed duration-150 text-zinc-700">Unavailable</Button> ) : <></>
                                    }
                                    
                                    {
                                        match.status == "active" && match.user.id == user.id ? (
                                        <Button onClick={handleSubmit} className="relative font-sanchez bg-highlight rounded-lg p-3 font-bold hover:brightness-130 cursor-pointer duration-150">
                                            <span className={status === "verifying" ? "invisible" : ""}>Check Scores</span>
                                            {status === "verifying" && (
                                                <LoaderCircle className="absolute inset-0 m-auto size-4 animate-spin"/>
                                            )}
                                        </Button> ) : <></>
                                    }


                                </div>
                            </div>
                        </ForegroundCard>
                    </div>
                    {
                        message ?
                        <div className=" mt-5 w-5/6 lg:w-1/2 p-3 bg-red-700/25 border rounded-md border-zinc-300/50">
                            <p className="text-subtext">{message}</p>
                        </div> : <></>
                    }
                    <div className="w-5/6 lg:w-1/2 mt-5">
                    {
                        match.status == "active" && match.user.id == user.id ? (
                        <ForegroundCard className="border-2 border-dotted border-zinc-500/50 flex-col lg:flex-row items-center gap-5">
                            <p className="font-sanchez font-bold shrink-0">
                                Load it in game!
                            </p>
                            <p className="font-sanchez text-subtext text-[13px] flex-1 leading-7">
                                Press <span className="bg-background p-1 border m-1">F2</span> on your table in Beatoraja or press <span className="bg-background p-1 border m-1">F8</span> in openLR2 to reload your match table!
                            </p>
                            <p className="font-mono bg-background p-2 border border-zinc-500 text-subtext shrink-0 text-xs lg:text-md">
                                https://arcadium.com/api/match/{match.user.id}/table
                            </p>
                            <div className="flex flex-row gap-4">
                                <Menu>
                                    <MenuButton className="text-highlight hidden cursor-pointer underline tracking-wide lg:flex flex-row items-center gap-1">
                                        Download Chart <ChevronDown className='size-4' />
                                    </MenuButton>
                                    <MenuItems
                                    anchor={{ to: "bottom start", gap: 30}}
                                    transition
                                    className="focus:outline-none flex flex-col gap-6 bg-foreground p-5 rounded-md font-bold transition duration-150 ease-out data-closed:opacity-0 w-50"
                                    >
                                        <MenuItem>
                                            <a href={`https://gingerrush.com/download/direct/${match.chart.md5}`} className="block data-focus:text-highlight duration-150">Gingerrush</a>
                                        </MenuItem>
                                        <MenuItem>
                                            <a href={`backbeat://charts/md5/${match.chart.md5}`} className="block data-focus:text-highlight duration-150">Backbeat <span className="text-sm text-subtext font-medium">(requires backbeat)</span></a>
                                        </MenuItem>
                                    </MenuItems>
                                </Menu>
                                {
                                    forfeitLoad ?
                                    <Button className="text-red-400 cursor-pointer"><span className="shrink-0 text-subtext"><LoaderCircle className=" m-auto size-4 animate-spin"/></span></Button> :
                                    <Button onClick={handleForfeit} className="text-red-400 hover:brightness-110 duration-150 cursor-pointer underline tracking-wide">Forfeit</Button>
                                }
                                
                            </div>
                        </ForegroundCard> ) : <></>
                    }

                    </div>
                </div>

            </div>
            
        </div>
    )
}