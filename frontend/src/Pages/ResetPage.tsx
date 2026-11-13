import { Field, Fieldset, Input, Label } from "@headlessui/react";
import { Link, useSearchParams } from "react-router";
import ArcButton from "../Components/General/ArcButton";
import { useState } from "react";
import { api } from "../util/helpers";

export default function ResetPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [error, setError] = useState<string>();

    const [complete, setComplete] = useState<boolean>(false);

    const changePassword = () => {
        if (password.trim() == "" || confirmPassword.trim() == "")
        {
            setError("Neither password field should be blank.")
            return;
        }

        if (password.trim() != confirmPassword.trim())
        {
            setError("Passwords must match.")
            return;
        }

        const body = {
            token: token,
            new_password: password
        }

        api("/auth/password/reset", { method: "PUT" , body: JSON.stringify(body)})
        .then(() => {
            setComplete(true)
        })
        .catch((err) => {
            setError(err instanceof Error ? err.message : "Something went wrong while resetting your password.")
        })
    }

    return (
        <div className="w-7/8 lg:w-1/4 flex flex-col mx-auto mt-5">
            <p className="text-lg font-archivo tracking-[0.2em] text-subtext">Reset Your Password</p>

            {
                error ?
                <div className="p-3 bg-red-700/25 border rounded-md border-zinc-300/50 mt-5">
                    <p className="text-subtext">{error}</p>
                </div> : <></>
            }

            {
                complete ?
                <div className="p-3 bg-green-700/25 border rounded-md border-zinc-300/50 mt-5">
                    <p className="text-subtext">Your password has been reset successfully, click <Link to="/login" className="text-highlight">here</Link> to log in!</p>
                </div> : <></>
            } 

            <Fieldset>
                <Field className="flex-1 mt-5">
                    <Label className="block font-bold text-zinc-200">Password</Label>
                    <Input 
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    type="password"
                    className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200"
                    />
                </Field>
                <Field className="flex-1 mt-5">
                    <Label className="block font-bold text-zinc-200">Confirm Password</Label>
                    <Input 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                    type="password"
                    className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200"
                    />
                </Field>
            </Fieldset>
            <ArcButton onClick={changePassword} className="self-end mt-5">Change Password</ArcButton>
        </div>
    )
}