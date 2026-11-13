import { Field, Fieldset, Input, Label } from "@headlessui/react";
import { useSearchParams } from "react-router";
import ArcButton from "../Components/General/ArcButton";
import { useState } from "react";

export default function ResetPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [error, setError] = useState<string>();

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
    }

    return (
        <div className="w-7/8 lg:w-1/4 flex flex-col mx-auto mt-5">
            <p className="text-lg font-archivo tracking-[0.2em] text-subtext">Reset Your Password</p>
            
            <Fieldset>
                <Field className="flex-1 mt-5">
                    <Label className="block font-bold text-zinc-200">Password</Label>
                    <Input 
                    type="password"
                    className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200"
                    />
                </Field>
                <Field className="flex-1 mt-5">
                    <Label className="block font-bold text-zinc-200">Confirm Password</Label>
                    <Input 
                    type="password"
                    className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200"
                    />
                </Field>
            </Fieldset>
            <ArcButton className="self-end mt-5">Change Password</ArcButton>
        </div>
    )
}