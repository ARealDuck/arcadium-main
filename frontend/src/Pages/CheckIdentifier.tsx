import { Field, Fieldset, Input, Label } from "@headlessui/react";
import { useState } from "react"
import { api } from "../util/helpers";
import ArcButton from "../Components/General/ArcButton";

export default function CheckIdentifier() {

    const [identifier, setIdentifier] = useState<string>("");
    const [error, setError] = useState<string>();
    const [complete, setComplete] = useState<boolean>(false);

    const sendEmail = () => {
        if (identifier.trim() == "")
        {
            setError("Your email or username should not be blank")
            return;
        }

        const body = { identifier: identifier }

        api("/auth/password/forgot", { method: "POST" , body: JSON.stringify(body)})
        .then(() => {
            setComplete(true)
            setError(undefined)
        })
        .catch(err => {
            setError(err instanceof Error ? err.message : "Something went wrong.")
        })
    }

    return (
        <div className="w-7/8 lg:w-1/4 flex flex-col mx-auto mt-5">
            <p className="text-lg font-archivo tracking-[0.2em] text-subtext">Enter Your Email Or Username</p>

            {
                error ?
                <div className="p-3 bg-red-700/25 border rounded-md border-zinc-300/50 mt-5">
                    <p className="text-subtext">{error}</p>
                </div> : <></>
            }

            {
                complete ?
                <div className="p-3 bg-green-700/25 border rounded-md border-zinc-300/50 mt-5">
                    <p className="text-subtext">If your user exists, you should receive an email with password reset instructions.</p>
                </div> : <></>
            }

            <Fieldset>
                <Field className="flex-1 mt-5">
                    <Label className="block font-bold text-zinc-200">Email or Username</Label>
                    <Input 
                    value={identifier}
                    onChange={(e) => setIdentifier(e.currentTarget.value)}
                    className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200"
                    />
                </Field>
            </Fieldset> 

            <ArcButton onClick={sendEmail} className="self-end mt-5">Send Reset Email</ArcButton>
        </div>
    )
}