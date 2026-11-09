import { Button, Field, Fieldset, Input, Label } from "@headlessui/react"
import { useState } from "react"
import { api, waitForJob } from "../../util/helpers";
import type { Job } from "../../util/NetworkModels";

export default function BokutachiKey() {
    const [tachiKey, setTachiKey] = useState<string>("")
    const [tachiProfile, setTachiProfile] = useState<any>()
    const [storedTachiKey, setStoredTachiKey] = useState<string>("");
    const [tachiError, setTachiError] = useState<boolean>(false);
    const [loadTachiKey, setLoadTachiKey] = useState<boolean>(false);

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

    const displayTachiKeyInsert = () => {

        return (
            <Fieldset className="lg:w-1/2 w-full flex flex-row items-end gap-3 mx-auto mt-20">
                <Field className="flex-1">
                    <Label className="block font-bold text-zinc-200">Tachi API Key</Label>
                    <Input 
                    onChange={(e) => setTachiKey(e.currentTarget.value)}
                    className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                    name="tachi_key"/>
                </Field>

                <Button onClick={submitTachiKey} className="h-10 font-sanchez inline-flex items-center gap-2 bg-highlight brightness-80 hover:brightness-100 duration-200 cursor-pointer p-3 rounded-md font-semibold"><MessageCircleDashedCheck className="size-4"/></Button>
            </Fieldset>
        )

    }

    return (
        <div>

        </div>
    )
}