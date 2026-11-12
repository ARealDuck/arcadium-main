import { Button, Field, Fieldset, Input, Label } from "@headlessui/react"
import { useEffect, useState } from "react"
import { api, waitForJob } from "../../util/helpers";
import type { Job } from "../../util/NetworkModels";
import ForegroundCard from "./ForegroundCard";
import LoadingSpinner from "./LoadingSpinner";
import { MessageCircleDashedCheck } from "lucide-react";



export default function BokutachiKey({ className, tachi_key, onConfirmed }: { className?: string, tachi_key?: string, onConfirmed?: () => void; }) {
    const [tachiKey, setTachiKey] = useState<string>(tachi_key ?? "")
    const [tachiProfile, setTachiProfile] = useState<any>()
    const [storedTachiKey, setStoredTachiKey] = useState<string>("");
    const [tachiError, setTachiError] = useState<boolean>(false);
    const [loadTachiKey, setLoadTachiKey] = useState<boolean>(false);
    const [loadConfirmKey, setLoadConfirmKey] = useState<boolean>(false)
    const [confirmTachiError, setConfirmTachiError] = useState<boolean>(false);

    const submitTachiKey = async () => {
        if (tachiKey.trim() == "" || loadTachiKey)
            return;

        setTachiProfile(undefined)
        setTachiError(false)
        setStoredTachiKey(tachiKey)

        try {
            const submitJob = await api<Job>(`/auth/me/tachi_key?tachi_key=${tachiKey}`, { method: "POST" })
        
            setLoadTachiKey(true);

            let job = await waitForJob(submitJob.id);

            setTachiError(false);
            setTachiProfile(job.result)
            setLoadTachiKey(false);
        }

        catch (err) {
            setTachiError(true);
            setLoadTachiKey(false)
        }

    }

    useEffect(() => {
        setTachiKey(tachi_key ?? "");
    }, [tachi_key]);

    const displayTachiKeyInsert = () => {

        return (
            <Fieldset className="w-full flex flex-row items-end gap-3 mx-auto mt-20">
                <Field className="flex-1">
                    <Label className="block font-bold text-zinc-200">Bokutachi API Key</Label>
                    <Input 
                    value={tachiKey}
                    onChange={(e) => setTachiKey(e.currentTarget.value)}
                    className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                    name="tachi_key"/>
                </Field>

                <Button onClick={submitTachiKey} className="h-10 font-sanchez inline-flex items-center gap-2 bg-highlight brightness-80 hover:brightness-100 duration-200 cursor-pointer p-3 rounded-md font-semibold"><MessageCircleDashedCheck className="size-4"/></Button>
            </Fieldset>
        )

    }

    const confirmTachiKey = async () => {
        if (storedTachiKey.trim() == "" || loadConfirmKey)
            return;

        setConfirmTachiError(false)

        try {
            const confirmJob = await api<Job | null>(`/auth/me/confirm_tachi_key?tachi_key=${storedTachiKey}`, { method: "PUT" })

            setLoadConfirmKey(true)

            if (confirmJob)
                await waitForJob(confirmJob.id)

            setLoadConfirmKey(false)

            onConfirmed?.()
        } catch (err) {
            console.error(err)
            setConfirmTachiError(true)
        }
    }

    return (
        <div className={className}>
            {displayTachiKeyInsert()}
            <ForegroundCard className="mt-10 mx-auto">
                <p className="font-sanchez font-bold text-xl tracking-widest">Bokutachi Profile</p>
                {
                    tachiError == false && confirmTachiError == false ?
                        !tachiProfile ?
                            !loadTachiKey ?
                            <p className="font-sanchez text-subtext mt-3">No profile loaded...</p> :
                            <div className="flex items-center justify-start self-start mt-3">
                                <LoadingSpinner className="m-0 mr-2"/>
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
        </div>
    )
}