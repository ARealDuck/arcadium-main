import { Button, Field, Fieldset, Input, Label, Legend } from "@headlessui/react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useEffect, useState } from "react";
import { api } from "../util/helpers";
import type { InviteStatus } from "../util/NetworkModels";

export default function Register() {

    const { register } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [username, setUsername] = useState<string>();
    const [displayName, setDisplayName] = useState<string>();
    const [email, setEmail] = useState<string>();
    const [emailConfirm, setEmailConfirm] = useState<string>();
    const [password, setPassword] = useState<string>();
    const [passwordConfirm, setPasswordConfirm] = useState<string>();
    const [inviteCode, setInviteCode] = useState<string>();
    const [invitesRequired, setInvitesRequired] = useState<boolean>(true)

    const [error, setError] = useState<string | null>(null)

    const handleRegister = async () => {

        if (
            !username ||
            !email ||
            !displayName ||
            !emailConfirm ||
            !password ||
            !passwordConfirm
        )
        {
            setError("Please ensure all fields are filled in.")
            return;
        }

        if (
            username.trim() == "" ||
            email.trim() == "" ||
            displayName.trim() == "" ||
            emailConfirm.trim() == "" ||
            password.trim() == "" ||
            passwordConfirm.trim() == ""
        )
        {
            setError("Please ensure all fields are filled in")
            return;
        }

        if (
            (email != emailConfirm) ||
            (password != passwordConfirm)
        )
        {
            setError("Please ensure your emails and passwords match.")
            return;
        }
        
        if (username.trim().length < 3 || username.trim().length > 20)
        {
            setError("Please ensure your username is of the appropriate length. Between 3 and 20 characters.")
            return;
        }

        if (displayName.trim().length < 3 || displayName.trim().length > 20)
        {
            setError("Please ensure your display name is of the appropriate length. Between 3 and 20 characters.")
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        {
            setError("Email must be in the correct format.")
            return;
        }

        if (password.trim().length < 3 && password.trim().length > 20)
        {
            setError("Password must be between 3 and 20 characters")
            return;
        }

        if (invitesRequired && (!inviteCode || inviteCode.trim() == ""))
        {
            setError("An invite code is required!")
            return;
        }

        try {
            await register(String(username), String(email), String(displayName), String(password), String(inviteCode));
            navigate(location.state?.from?.pathname ?? "/", { replace: true });
        } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        }
    }

    useEffect(() => {
        api<InviteStatus>("/invite/status")
        .then(status => {
            setInvitesRequired(status.invites_required)
        })
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <form className="lg:w-1/4 w-5/6">
                <Fieldset className="space-y-8">
                    <Legend className="text-4xl font-bold">Register</Legend>

                    {
                        error ?
                        <div className="p-3 bg-red-700/25 border rounded-md border-zinc-300/50">
                            <p className="text-subtext">{error}</p>
                        </div> : <></>
                    }


                    <Field>
                        <Label className="block font-bold">Username <span className="text-subtext font-light text-sm">3 - 20 Alphanumeric Characters</span></Label>
                        <Input 
                        onInput={(e) => setUsername(e.currentTarget.value)} 
                        value={username} 
                        className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                        name="username"
                        />
                    </Field>

                    <Field>
                        <Label className="block font-bold">Display name <span className="text-subtext font-light text-sm">3 - 20 Characters, spaces allowed</span></Label>
                        <Input 
                        onInput={(e) => setDisplayName(e.currentTarget.value)} 
                        value={displayName}
                        className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                        name="username"
                        />
                    </Field>

                    <Field>
                        <Label className="block font-bold">Email</Label>
                        <Input 
                        type="email"
                        onInput={(e) => setEmail(e.currentTarget.value)}
                        value={email}
                        className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                        name="email"
                        />
                    </Field>

                    <Field>
                        <Label className="block font-bold">Confirm Email</Label>
                        <Input
                        type="email"
                        onInput={(e) => setEmailConfirm(e.currentTarget.value)}
                        value={emailConfirm} 
                        className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                        name="emailConfirm"/>
                    </Field>

                    <Field>
                        <Label className="block font-bold">Password <span className="text-subtext text-sm font-light">3 - 20 Characters</span></Label>
                        <Input
                        onInput={(e) => setPassword(e.currentTarget.value)}
                        value={password} 
                        type="password" 
                        className="mt-1 block bg-background-dark w-full p-2 rounded-md focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                        name="password"/>
                    </Field>

                    <Field>
                        <Label className="block font-bold">Confirm Password</Label>
                        <Input
                        onInput={(e) => setPasswordConfirm(e.currentTarget.value)}
                        value={passwordConfirm} 
                        type="password" 
                        className="mt-1 block bg-background-dark w-full p-2 rounded-md focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                        name="passwordConfirm"/>
                    </Field>

                    <Field>
                        <Label className="block font-bold">Invite Code</Label>
                        <Input 
                        onInput={(e) => setInviteCode(e.currentTarget.value)}
                        value={inviteCode}
                        className="mt-1 block bg-background-dark w-full p-2 rounded-md focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                        name="inviteCode"/>
                    </Field>

                    <Field className="flex justify-end gap-5 items-center">
                        <div>
                            <p>Already have an account? <Link className="text-highlight hover:text-purple-400 duration-200" to="/login">Log in!</Link></p>
                        </div>
                        <Button type="submit" onClick={(e) => { e.preventDefault(); handleRegister() }} className="bg-zinc-600 p-4 rounded-md hover:bg-zinc-500 duration-200 cursor-pointer font-bold">Register</Button>
                    </Field>
                </Fieldset>
            </form>


        </div>
    )
}