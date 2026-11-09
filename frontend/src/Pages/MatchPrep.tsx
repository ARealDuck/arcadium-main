import { Input, Radio, RadioGroup } from "@headlessui/react";
import { Podium } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import ArcButton from "../Components/General/ArcButton";
import ForegroundCard from "../Components/General/ForegroundCard";
import LoadingSpinner from "../Components/General/LoadingSpinner";
import { QueueIcon } from "../Components/Home/QueueCard";
import TableSection from "../Components/Match/TableSection";
import SeedPicker from "../Components/MatchPrep/SeedPicker";
import { useAuth } from "../hooks/useAuth";
import { useDebounce } from "../hooks/useDebounce";
import type { TableInfo } from "../util/MiscInterfaces";
import type { Match, TableCounts, UserRating } from "../util/NetworkModels";
import { games, ladder as ladderCorrect, playtype as playtypeCorrect } from "../util/dictionaryCorrections";
import { api, ApiError, apiWithStatus, toFixedTruncated } from "../util/helpers";

export default function MatchPrep() {
    const { user, } = useAuth();
    const { game, playtype, ladder } = useParams();

    const [rating, setRating] = useState<UserRating>()
    const [error, setError] = useState<string>();

    const [selected, setSelected] = useState<string[]>([])
    const [matchType, setMatchType] = useState<"competitive" | "casual">("competitive")
    const [targetRating, setTargetRating] = useState<number>(0)
    
    const [tableCounts, setTableCounts] = useState<TableCounts>();

    const debouncedRating = useDebounce(targetRating, 400);
    const navigate = useNavigate();
    const location = useLocation();

    function toggle(icon: string, on: boolean) {
        setSelected(prev => on ? [...prev, icon] : prev.filter(i => i !== icon))
    }

    const TABLES: TableInfo[] = [
        { tableIcon: "☆", tableName: "Normal", category: "general" },
        { tableIcon: "★", tableName: "Insane", category: "general" },
        { tableIcon: "★★", tableName: "Overjoy", category: "general"},
        { tableIcon: "▽", tableName: "Normal2", category: "general" },
        { tableIcon: "▼", tableName: "Insane2", category: "general" },
        { tableIcon: "ξ", tableName: "Stardust", category: "general" },
        { tableIcon: "sr", tableName: "Starlight", category: "general" },
        { tableIcon: "sl", tableName: "Satellite", category: "general" },
        { tableIcon: "st", tableName: "Stella", category: "general" },
        { tableIcon: "dy", tableName: "Dystopia", category: "general" },
        { tableIcon: "Ude", tableName: "Arm Shougakkou", category: "skillset" },
        { tableIcon: "乱打", tableName: "Code Stream (sl)", category: "skillset" },
        { tableIcon: "重発狂", tableName: "Code Stream (st)", category: "skillset" },
        { tableIcon: "dl", tableName: "Delayjoy", category: "skillset" },
        { tableIcon: "fr", tableName: "Exoplanet", category: "skillset" },
        { tableIcon: "双", tableName: "Gachimijoy", category: "skillset" },
        { tableIcon: "◆", tableName: "LN", category: "skillset" },
        { tableIcon: "ln", tableName: "Luminous", category: "skillset" },
        { tableIcon: "SB", tableName: "Scramble", category: "skillset" },
        { tableIcon: "h◎", tableName: "Scratch 3rd", category: "skillset" },
        { tableIcon: "so", tableName: "Solar", category: "skillset" },
        { tableIcon: "sn", tableName: "Supernova", category: "skillset" }
]

    const generalTables = TABLES.filter(t => t.category === "general");
    const skillsetTables = TABLES.filter(t => t.category === "skillset");
    const [ratingStatus, setRatingStatus] = useState<"loading" | "none" | "seeding" | "done">("loading");

    const selectedCharts = selected.reduce((sum, icon) => sum + (tableCounts?.[icon] ?? 0), 0);
    const MAX_ELO = 4300;
    const MIN_ELO = 100;

    const countsKey = matchType === "competitive" ? "competitive" : debouncedRating;

    useEffect(() => {
        if (!user) return;

        let cancelled = false;
        const url = `/users/me/ratings/${game}/${playtype}/${ladder}`;

        async function load() {
            try {
                let rating: UserRating | null;
                try {
                    rating = await api<UserRating>(url); 
                    setRatingStatus("done")           
                    setRating(rating)     
                    setSelected(rating.selected_tables)      
                } catch (err) {
                    if (!(err instanceof ApiError && err.status === 404)) throw err
                    if ((err instanceof ApiError && err.status === 404)) setRatingStatus("none");
                }
            }
            catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
            }
        }

        load();
        return () => { cancelled = true; };
    }, [user?.id, game, playtype, ladder])

    useEffect(() => {
        if (!rating)
            return;

        if (!user)
            return

        setTableCounts(undefined);

        if (matchType == "competitive") {
            api<TableCounts>(`/users/me/get_table_search_counts/${game}/${playtype}/${ladder}`)
            .then(tableCounts => {
                setTableCounts(tableCounts);
            })
        }
        else {
            api<TableCounts>(`/chart/get_table_search_counts/${game}/${playtype}/${ladder}/${toFixedTruncated(Math.min(Math.max(debouncedRating, 100), 4200), 0)}`)
            .then(tableCounts => {
                setTableCounts(tableCounts);
            })
        }

        if (Number.isNaN(debouncedRating)) return;
    }, [countsKey, rating])

    const seedPlayer = (body?: { source: string, preset?: string }) => {
        setRatingStatus("seeding")

        apiWithStatus<UserRating>(`/users/me/ratings/${game}/${playtype}/${ladder}`, { method: "POST", body: JSON.stringify(body) })
        .then(({ status, data }) => {
            if (status == 202) {
                startPolling();
                return;
            }
            setRating(data)
            setRatingStatus("done")
            setSelected(data.selected_tables)
        })
        .catch(() => setRatingStatus("none"))
    }

    const startPolling = () => {
        const interval = setInterval(() => {
            apiWithStatus<UserRating>(`/users/me/ratings/${game}/${playtype}/${ladder}`, {
                method: "POST"
            })
            .then(({ status, data  }) => {
                if (status === 202) return;
                clearInterval(interval);
                setRating(data);
                setRatingStatus("done")
            })
            .catch(() => {
                clearInterval(interval);
                setRatingStatus("none");
            })
        }, 2000)
    }

    const handleQueue = async () => {
        if (matchType == "competitive") 
        {
            api<Match>(`/match/create?game=${game}&playtype=${playtype}&ladder=${ladder}&type=${matchType}`, 
                { 
                    method: "POST",
                    body: JSON.stringify({ tables: selected })
                })
            .then((match) => {
                navigate(`/match/${match.id}`)
            })
            .catch(err => console.log(err.message))
        }
        else {
            api<Match>(`/match/create?game=${game}&playtype=${playtype}&ladder=${ladder}&type=${matchType}&elo=${debouncedRating}`, 
                { 
                    method: "POST",
                    body: JSON.stringify({ tables: selected })
                })
            .then((match) => {
                navigate(`/match/${match.id}`)
            })
            .catch(err => console.log(err.message))            
        }

    }

    const selectAll = (tables: TableInfo[], on: boolean) => {
        const icons = tables.map(t => t.tableIcon);
        setSelected(prev => {
            const rest = prev.filter(i => !icons.includes(i));
            return on ? [...rest, ...icons] : rest;
        })
    }

    useEffect(() => {
        if (rating == null)
            return

        setTargetRating(rating.display_rating)
    }, [matchType])
    
    if (ratingStatus == "loading" || ratingStatus == "seeding" || !playtype || !game || !ladder) {
        return <LoadingSpinner className="size-15" />
    }

    if (ratingStatus == "none")
        return <SeedPicker seedPlayer={seedPlayer} />

    return (
        <div key={location.pathname} className="flex-1 flex w-5/6 mx-auto lg:w-auto items-center justify-center mt-5">
            <div className="flex flex-col">
                <div>
                    <p className="font-archivo text-subtext uppercase tracking-[0.2em]">{games[game]} {playtypeCorrect[playtype]} &middot; {ladderCorrect[ladder]}</p>
                    <h1 className="font-extrabold text-4xl tracking-[0.2em] mt-3 mb-3">Choose Your Tables</h1>
                    <p className="font-sanchez text-subtext mb-5">Charts are only drawn from within the tables you pick</p>
                </div>
                <div className="flex lg:flex-row flex-col w-full max-w-7xl lg:items-start gap-8 mt-5">
                    <ForegroundCard className="lg:w-72 w-full shrink-0">
                        <QueueIcon
                        placed={rating?.placed}
                        rating={rating?.display_rating}
                        displayRating={true}
                        displayProgress={true}
                        />

                        <hr className="text-zinc-600/85 my-5" />

                        <p className="font-archivo tracking-widest text-subtext mb-5">Match Type</p>
                        <div>
                            <RadioGroup
                            value={matchType}
                            onChange={setMatchType}
                            aria-label="Match type"
                            className="grid grid-cols-2 gap-1 rounded-lg border border-zinc-700 bg-background p-1"
                            >
                                <Radio
                                value="competitive"
                                className="cursor-pointer select-none rounded-md py-2 text-center font-semibold text-subtext transition-colors data-checked:bg-highlight data-checked:text-white"
                                >
                                    Ranked
                                </Radio>

                                <Radio
                                value="casual"
                                className="cursor-pointer select-none rounded-md py-2 text-center font-semibold text-subtext transition-colors data-checked:bg-highlight data-checked:text-white"
                                >
                                    Casual
                                </Radio>
                            </RadioGroup>
                        </div>
                        <p className="font-archivo tracking-widest text-subtext mb-5 mt-5">Target Rating</p>
                        <Input
                        disabled={matchType == "competitive"} 
                        className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none bg-background p-3 rounded-md hover:bg-zinc-800/80 duration-200 font-mono tracking-widest focus:outline-none font-bold"
                        max={MAX_ELO}
                        min={MIN_ELO} 
                        type={"number"} 
                        value={toFixedTruncated(targetRating, 0)}   
                        onChange={(e) => {
                        const v = parseInt(e.currentTarget.value);
                        setTargetRating(Number.isNaN(v) ? NaN : Math.min(v, MAX_ELO));
                        }} 
                        onBlur={() => {
                            setTargetRating(r => Number.isNaN(r) ? MIN_ELO : Math.max(r, MIN_ELO));
                        }}
                        
                        />
                    </ForegroundCard>
                    <div className="flex-1 min-w-0">
                        <div className="self-start">
                            <TableSection 
                            label={"General Tables"}
                            tables={generalTables}
                            selected={selected}
                            tableCounts={tableCounts}
                            selectAll={selectAll}
                            toggle={toggle}
                            />

                            <div className="mt-10"></div>

                            <TableSection 
                            label={"Skillset Tables"}
                            tables={skillsetTables}
                            selected={selected}
                            tableCounts={tableCounts}
                            selectAll={selectAll}
                            toggle={toggle}
                            />

                            {
                                error ?
                                <div className="mt-3 p-3 bg-red-700/25 border rounded-md border-zinc-300/50">
                                    <p className="text-subtext">{error}</p>
                                </div> : <></>
                            }
                            <ForegroundCard className="mt-5">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-sanchez">{selected.length} Tables &middot; up to {selectedCharts} Charts In Range</p>
                                    </div>
                                    <ArcButton disabled={selectedCharts < 25} onClick={handleQueue}>Queue <Podium className="size-5 font-bold"/></ArcButton>
                                </div>
                            </ForegroundCard>
                        </div>
                    </div>          
                </div>
            </div>




        </div>
    )
}