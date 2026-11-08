import { useParams } from "react-router";
import ProfileActivityCalendar from "../Components/Profile/ProfileActivityCalendar";
import ProfileGameTabs from "../Components/Profile/ProfileGameTabs";
import ProfileHeader from "../Components/Profile/ProfileHeader";
import ProfileLampsAndRecents from "../Components/Profile/ProfileLampsAndRecents";
import ProfileMilestoneCard from "../Components/Profile/ProfileMilestoneCard";
import ProfileRatingOverTime from "../Components/Profile/ProfileRatingOverTime";
import ProfileRecentMatches from "../Components/Profile/ProfileRecentMatches";
import ProfileStatRow from "../Components/Profile/ProfileStatRow";
import ProfileTableWinrate from "../Components/Profile/ProfileTableWinrate";
import ProfileTierCard from "../Components/Profile/ProfileTierCard";
import { useAuth } from "../hooks/useAuth";
import { bmsAACollector, bmsVeteran } from "../util/milestoneDictionaries";
import { useEffect, useState } from "react";
import { api } from "../util/helpers";
import type { ProfileRating, UserProfileInfo } from "../util/NetworkModels";
import ForegroundCard from "../Components/General/ForegroundCard";
import { LoaderCircle } from "lucide-react";
import LoadingSpinner from "../Components/General/LoadingSpinner";

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const { id } = useParams();

    const [profile, setProfile] = useState<UserProfileInfo>();
    const [rating, setRating] = useState<ProfileRating>();

    const [ladder, setLadder] = useState<string>("ec");
    const [game, setGame] = useState<"bms">("bms");
    const [playtype, setPlaytype] = useState<"7k">("7k")

    useEffect(() => {
        if (!id)
            return;

        api<UserProfileInfo>(`/users/profile/${id}/${game}/${playtype}/${ladder}`)
        .then(profile => {
            setProfile(profile)

            setRating(profile.ratings.find(item => (
                item.game == game &&
                item.ladder == ladder &&
                item.playtype == playtype
            )))
            
        })
    }, [ladder, game, playtype])

    const setNewLadder = (value: string) => {
        setLadder(value)
    }

    if (loading || !profile)

    return (
            <LoadingSpinner className="fixed inset-0" />
        )

    return (
        <div className="flex flex-col gap-5 mx-auto w-7/8 lg:w-1/2 mt-10">
            <ProfileHeader
            displayName={profile.generic.display_name}
            date={profile.generic.join_date}
            avatarUrl={profile.generic.avatar_url}
            />

            {!rating ? (
                <ForegroundCard>
                    <p className="font-sanchez font-bold text-center">You have no ratings! Play a ranked match on any ladder to get a rating!</p>
                    <p className="font-sanchez text-subtext mt-3 text-center">You need to link your account to Bokutachi to be able to play!</p>
                </ForegroundCard>  
            ) : (
                <>

                <ProfileGameTabs
                ratings={profile.ratings}
                currentLadder={ladder}
                setNewLadder={setNewLadder}
                />

                <div className="flex flex-col lg:flex-row gap-5">
                    <ProfileTierCard 
                    className="w-full lg:w-1/4"
                    rating={rating}
                    rank={profile.rating_rank ?? 0}
                    total={profile.rating_total ?? 0}
                    lastPlayed={profile.last_played}
                    />

                    <div className="w-full lg:w-3/4 flex flex-col gap-5">
                        <ProfileStatRow 
                        className="flex-1"
                        matchCount={rating.games_played}
                        wins={rating.wins}
                        />

                        <ProfileRatingOverTime
                        className="flex-3"
                        series={profile.ladder_stats?.rating_series ?? []}/>
                    </div>
                </div>

                <p className="font-archivo p-2 tracking-[0.2em]">MILESTONES</p>
                <hr className="text-zinc-600"/>

                <div className="flex flex-col lg:flex-row gap-5">
                    <ProfileMilestoneCard
                    className="flex-1"
                    milestoneName="AA Collector"
                    countTitle="AAs"
                    descriptor="AA or better"
                    milestoneLadder={bmsAACollector}
                    value={profile.bms?.num_aa ?? 0}
                    />
                    <ProfileMilestoneCard
                    className="flex-1"
                    milestoneName="Veteran"
                    countTitle="matches"
                    descriptor="Ranked matches played"
                    milestoneLadder={bmsVeteran}
                    value={rating.games_played}
                    />
                </div>

                <div className="flex flex-col lg:flex-row gap-5">
                    <ProfileTableWinrate 
                    className="flex-1" 
                    table_winrate={profile.bms?.table_winrate ?? []}
                    />

                    <ProfileLampsAndRecents 
                    className="flex-1"
                    matches={profile.ladder_stats?.matches ?? []}
                    lamps={profile.ladder_stats?.lamp_counts ?? {}}
                    />
                </div>

                <div className="flex flex-col lg:flex-row gap-5">
                    <ProfileActivityCalendar 
                    className="flex-1" 
                    data={profile.ladder_stats?.activity ?? {}}
                    />

                    <ProfileRecentMatches 
                    className="flex-1" 
                    matches={profile.ladder_stats?.matches ?? []}
                    />
                </div>        
                </>
            )}

        </div>
    )
}