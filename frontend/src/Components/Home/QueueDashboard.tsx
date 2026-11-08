import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import QueueCard from "./QueueCard";
import type { UserRating, Tier, CanQueue, Job, TierData } from "../../util/NetworkModels";
import { api, waitForJob } from "../../util/helpers";
import { Button, Field, Fieldset, Input, Label } from "@headlessui/react";
import { MessageCircleDashedCheck } from "lucide-react";

export default function QueueDashboard() {

    type Status = "idle" | "saving" | "verifying" | "done" | "error"

    const [status, setStatus] = useState<Status>("idle");
    const [message, setMessage] = useState<string | null>(null);

    const { user, loading } = useAuth();

    const [ratings, setRatings] = useState<UserRating[]>([])
    const [tiers, setTiers] = useState<Tier[]>([])
    const [canQueue, setCanQueue] = useState<CanQueue>({can_queue: false})
    const [tachiKey, setTachiKey] = useState<string>();
    const[error, setError] = useState<string>()

    useEffect(() => {
        if (!user) return;

        Promise.all([
            api<UserRating[]>("/users/me/ratings"),
            api<TierData>("/info/tiers"),
            api<CanQueue>("/users/me/can-queue")
        ])
        .then(([ratings, tiers, canQueue]) => {
            setRatings(ratings);
            setTiers(tiers.tiers);
            setCanQueue(canQueue)
        })
        .catch(err => setError(err.message))
    }, [user, status === "done"])

    const displayQueueCards = () => {
        return ratings.length > 0 ? (
            <>
                <p className="font-semibold font-sanchez">WIP Page, click on Queue to join a ladder!</p>
                {/* {
                    ratings.map(rating => {

                    const playerRating : UserRating = { 
                        ladder:  rating.ladder ?? "ec",
                        display_rating: rating.placed ? rating.display_rating : -1,
                        placed: rating.placed,
                        games_played: rating.games_played,
                        rank: rating.placed ? rating.rank : -1,
                        total: rating.total,
                        wins: rating.wins,
                        losses: rating.losses
                    }                       
                        return (
                            <QueueCard 
                            key={rating.ladder}
                            rating={playerRating} 
                            tiers={tiers}
                            displayProgress={true}
                            />
                        )

                    })
                } */}
            </>
        ) : (
            <p className="font-semibold font-sanchez">You have played in no ladders. Click Queue to enter one now!</p>
        )
    }

    return loading ? (
        <></> ) : (
        <div className="flex flex-col lg:flex-row items-center gap-5 justify-center w-full bg-foreground p-5">
            {displayQueueCards()}
        </div>
    )

}