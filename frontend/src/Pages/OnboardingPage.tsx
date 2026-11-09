import { Button, Disclosure, DisclosureButton, DisclosurePanel, Field, Fieldset, Input, Label } from "@headlessui/react";
import { ChevronDown, MessageCircleDashedCheck } from "lucide-react";
import { useEffect, useState } from "react";
import ForegroundCard from "../Components/General/ForegroundCard";

import { useNavigate } from "react-router";
import CreateNewAPIKey from "../assets/onboarding_assets/tachi_create_key.png";
import CreateAPIKey from "../assets/onboarding_assets/tachi_create_key_2.png";
import MyIntegrations from "../assets/onboarding_assets/tachi_my_integrations.png";
import LoadingSpinner from "../Components/General/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import { api, waitForJob } from "../util/helpers";
import type { Job, User } from "../util/NetworkModels";

export default function OnboardingPage() {

    const PHASES = [
        "Setting up your Bokutachi API key",
        "Getting songs",
        "Setting up your match tables"
    ]

    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    const [phase, setPhase] = useState<number>(0);
    const [loadConfirmKey, setLoadConfirmKey] = useState<boolean>(false)
    const [confirmTachiError, setConfirmTachiError] = useState<boolean>(false);

    useEffect(() => {
        if (!user)
            return;

        if (user.has_tachi_key)
            setPhase(1);
    }, [])

    const confirmTachiKey = async () => {
        if (storedTachiKey.trim() == "" || loadConfirmKey)
            return;

        setConfirmTachiError(false)

        try {
            const confirmJob = await api<Job>(`/auth/me/confirm_tachi_key?tachi_key=${storedTachiKey}`, { method: "PUT" })

            setLoadConfirmKey(true)

            await waitForJob(confirmJob.id)

            setLoadConfirmKey(false)

            setPhase(phase+1);
        } catch (err) {
            setConfirmTachiError(true)
        }
    }

    const finishOnboarding = async () => {
        try {
            let updatedUser = await api<User>(`/auth/me/finish_onboarding`, { method: "PUT" })
            
            setUser(updatedUser)

            navigate("/")
        } catch (err) {
            console.log(err)
        }
    }

    const displayPhases = () => {
        if (phase === 0) {
            return (
                <div>
                    {displayTachiKeyInsert()}

                    <ForegroundCard className="mt-10 lg:w-1/2 mx-auto">
                        <p className="font-sanchez font-bold text-xl tracking-widest">Tachi Profile</p>

                        {
                            tachiError == false && confirmTachiError == false ?
                                !tachiProfile ?
                                    !loadTachiKey ?
                                    <p className="font-sanchez text-subtext mt-3">No profile loaded...</p> :
                                    <div className="flex items-center justify-start mt-3">
                                        <LoadingSpinner className="mr-2"/>
                                        <p className="font-sanchez text-subtext">Loading Profile...</p>
                                    </div> : 
                                <p className="font-sanchez mt-3 font-bold text-lg"><span className="text-subtext">{tachiProfile.username}</span></p> :
                            confirmTachiError == true ?
                            <p className="font-sanchez text-red-500 mt-3">There was an error confirming your Tachi key.</p> :
                            <p className="font-sanchez text-red-500 mt-3">That API key is not linked to any users.</p>
                            
                        }
                        <div className="flex justify-end">
                            <Button
                            disabled={!tachiProfile || loadConfirmKey}
                            onClick={confirmTachiKey}
                            className="relative font-sanchez flex items-center gap-2 bg-highlight brightness-80 enabled:hover:brightness-100 duration-200 cursor-pointer p-3 rounded-sm font-bold mt-3
                                        data-disabled:bg-zinc-700 data-disabled:text-zinc-400 data-disabled:cursor-not-allowed"
                            >
                            <span className={loadConfirmKey ? "invisible" : ""}>Confirm Link</span>
                            {loadConfirmKey && <LoadingSpinner className="absolute inset-0"/>}
                            </Button>
                        </div>
                        
                        
                    </ForegroundCard>
                    
                    <div className="mt-5 lg:w-1/2 mx-auto">

                    <Disclosure>
                    {({ open }) => (
                        <>
                        <DisclosureButton className="flex w-full items-center justify-between py-2 cursor-pointer">
                        <p className="font-archivo text-xl tracking-widest font-extralight">How to create a Bokutachi API Key</p>
                            <ChevronDown className={`size-4 duration-200 ${open ? "rotate-180" : ""}`} />
                        </DisclosureButton>
                        
                        <DisclosurePanel>
                            <p className="font-sanchez mt-5 text-lg">- Head over to <a className="text-highlight" target="_blank" href="https://boku.tachi.ac/">Bokutachi</a> and log in or make an account.</p>

                            <ForegroundCard className="mt-3">
                                <p className="font-sanchez text-subtext">- If this is your first time using Bokutachi, you need to set up your BMS client with IR integration.</p>
                            </ForegroundCard>

                            <hr className="mt-5 text-zinc-400/50" />
                            
                            <p className="font-sanchez mt-5 text-lg">- Click on your profile name on the top right and click <span className="font-bold">My Integrations</span></p>

                            <img className="mt-5 rounded-xl mx-auto border border-zinc-500/40" src={MyIntegrations} alt="My Integrations in Tachi"/>

                            <hr className="mt-5 text-zinc-400/50" />

                            <p className="font-sanchez mt-5 text-lg">- Click on <span className="font-bold">Create new API key</span>, give it any name, and click <span className="font-bold">Create Key</span>. Leave every box unchecked.</p>

                            <img className="mt-5 rounded-xl mx-auto border border-zinc-500/40" src={CreateNewAPIKey} alt="My Integrations in Tachi"/>
                            <img className="mt-5 rounded-xl mx-auto border border-zinc-500/40" src={CreateAPIKey} alt="My Integrations in Tachi"/>

                            <hr className="mt-5 text-zinc-400/50" />

                            <p className="font-sanchez mt-5 text-lg mb-25">- Click once to reveal the key, and then copy it to the input above.</p>
                        </DisclosurePanel>
                        </>
                    )}
                    </Disclosure>
                    </div>

                </div>
            )
        }
        else if (phase === 1) {
            return (
                <div className="font-sanchez lg:w-3/4 mx-auto mt-10 flex flex-col">
                    Arcadium uses the same difficulty tables that Bokutachi uses. If you already have a table or more full of songs, you can skip this section.

                    <ForegroundCard className="mt-2">
                        <p className="text-subtext">This section is a work-in-progress... it will be fleshed out at a later date.</p>
                    </ForegroundCard>

                    <p>Arcadium expects you to have a sizeable collection, or at least one or two solid tables filled. Below are the recommended tables to get set up with. You only need one or two of these to play properly.</p>
                    
                    <ul className="mt-5">
                        <li className="text-subtext">- Normal 
                            [
                                <a href="https://makiba.ac/tables/bms-7k/normal" target="_blank" className="text-highlight">Makiba</a> | 
                                <a href="https://darksabun.club/table/archive/normal1/" target="_blank" className="text-highlight"> DARK SABUN</a>
                            ]
                        </li>
                        <li className="text-subtext">- Normal2 
                            [
                                <a href="https://makiba.ac/tables/bms-7k/normal2" target="_blank" className="text-highlight">Makiba</a> | 
                                <a href="http://rattoto10.jounin.jp/table.html" target="_blank" className="text-highlight"> NEW GENERATION</a>
                            ]
                        </li>
                        <li className="text-subtext">- Insane</li>
                        <li className="text-subtext">- Insane2</li>
                        <li className="text-subtext">- Stardust</li>
                        <li className="text-subtext">- Starlight</li>
                        <li className="text-subtext">- Satellite</li>
                        <li className="text-subtext">- Overjoy</li>
                        <li className="text-subtext">- Stella</li>
                    </ul>

                    <ForegroundCard className="mt-4">
                        <p className="text-subtext">Note: If some songs are hard to find, you can choose to <i>skip</i> that song in a match, which will prevent you from getting it again. You only get the first thirty seconds to do this.</p>
                    </ForegroundCard>

                    <Button
                    onClick={() => setPhase(2)}
                    className="self-end relative font-sanchez flex items-center gap-2 bg-highlight brightness-80 enabled:hover:brightness-100 duration-200 cursor-pointer p-3 rounded-sm font-bold mt-3
                                "
                    >
                    Next
                    </Button>
                    
                </div>
            )
        } else if (phase === 2) {
            return (
                <div className="font-sanchez lg:w-3/4 mx-auto mt-10 flex flex-col">
                    <p>Arcadium offers match tables that you can apply to your client. This way, chosen charts come up immediately to your game upon refreshing</p>

                    <p className="font-archivo text-subtext tracking-[0.2em] mt-3">Match Table</p>
                    <p className="font-mono">https://arcadium.com/api/match/{user?.id ?? "NA"}/table</p>

                    <p className="mt-3">Upon adding this to your game, you should see a "User has no active match". Once you start a match, ensure you're over the parent "table" folder, and press your table refresh button.</p>

                    <ul>
                        <li className="font-mono">- F8 on LR2 / openLR2</li>
                        <li className="font-mono">- F2 on beatoraja / LR2oraja</li>
                    </ul>
                    
                    <p className="mt-3">Then enter the table and you should see the song update.</p>

                    <Button
                    onClick={finishOnboarding}
                    className="self-end relative font-sanchez flex items-center gap-2 bg-highlight brightness-80 enabled:hover:brightness-100 duration-200 cursor-pointer p-3 rounded-sm font-bold mt-3
                                "
                    >
                    Finish Onboarding
                    </Button>
                </div>
            )
        }
    }

    return (
        <div className="w-7/8 lg:w-3/4 mx-auto mt-20">
            <p className="font-archivo text-4xl text-subtext tracking-[0.2em] uppercase">Onboarding</p>

            <p className="mt-5 font-sanchez text-2xl tracking-widest font-bold">{PHASES[phase]}</p>

            {displayPhases()}
        </div>
    )
}