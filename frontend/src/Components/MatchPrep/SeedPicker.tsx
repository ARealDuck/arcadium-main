import { useEffect, useState } from "react";
import ArcButton from "../General/ArcButton";
import { api, returnSieglinde } from "../../util/helpers";
import type { SeedOptions } from "../../util/NetworkModels";
import LoadingSpinner from "../General/LoadingSpinner";

export default function SeedPicker({ seedPlayer } : { seedPlayer: (body? : { source: string, preset?: string }) => void; }) {
    const [seedOptions, setSeedOptions] = useState<SeedOptions>();

    useEffect(() => {
        api<SeedOptions>("/users/me/ratings/bms/7k/ec/seed-options")
        .then(seedOptions => {
            setSeedOptions(seedOptions)
        })
    }, [])

    if (!seedOptions)
        return (
            <LoadingSpinner />
        )

    const tachiLevel = returnSieglinde(seedOptions.tachi?.level ?? 0)

    return (
        <div className="min-h-screen flex flex-col tracking-[0.2em] items-center justify-center gap-3">
            <p className="text-subtext mb-5 font-archivo">How would you like to be seeded?</p>
            <div className="w-fit mx-auto flex flex-col gap-3">
                {seedOptions.presets.map(option => (
                    <ArcButton
                    className="bg-zinc-800 border border-zinc-500/50 capitalize rounded-lg"
                    onClick={() => seedPlayer({ source: "preset", preset: option.key })}
                    >
                        {option.key} ~☆{option.level}
                    </ArcButton>
                ))}
                {seedOptions.tachi != null ?
                <>
                  <p className="text-center">or</p>

                    <ArcButton
                    className="bg-zinc-800 border border-zinc-500/50 capitalize rounded-lg"
                    onClick={() => seedPlayer()}
                    >
                        Bokutachi ~{tachiLevel.icon}{tachiLevel.number}
                    </ArcButton>            
                </> : <></>

                }

            </div>

        </div>
    )
}