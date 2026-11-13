import { Button, Field, Fieldset, Input, Label, Legend } from "@headlessui/react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";

export default function Login() {

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState<string | null>(null)

    const [identifier, setIdentifier] = useState<string>();
    const [password, setPassword] = useState<string>();

    const handleLogin = async () => {

        if (identifier?.trim() == "" || password?.trim() == "")
        {
            setError("Please input an email or username")
            return;
        }

        if (!identifier || !password)
        {
            setError("Please input an email or username")
            return;
        }

        try {
            await login(String(identifier), String(password));
            navigate(location.state?.from?.pathname ?? "/", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <form className="lg:w-1/4 w-5/6">
                <Fieldset className="space-y-8">
                    <Legend className="text-4xl font-bold">Login</Legend>

                    {
                        error ?
                        <div className="p-3 bg-red-700/25 border rounded-md border-zinc-300/50">
                            <p className="text-subtext">{error}</p>
                        </div> : <></>
                    }


                    <Field>
                        <Label className="block font-bold">Username or Email</Label>
                        <Input 
                        onInput={(e) => setIdentifier(e.currentTarget.value)} 
                        value={identifier}
                        className="mt-1 block bg-background-dark w-full p-2 rounded-md font-semibold focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                        name="identifier"/>
                    </Field>

                    <Field>
                        <Label className="block font-bold">Password <Link to="/check-identifier" className="cursor-pointer text-highlight text-sm ml-3">Forgot password?</Link></Label>
                        <Input 
                        onInput={(e) => setPassword(e.currentTarget.value)} 
                        value={password}
                        type="password" 
                        className="mt-1 block bg-background-dark w-full p-2 rounded-md focus:outline-none data-hover:bg-zinc-600/25 duration-200" 
                        name="password"/>
                    </Field>

                    <Field className="flex justify-end gap-5 items-center">
                        <div>
                            <p>Don't have an account? <Link className="text-highlight hover:text-purple-400 duration-200" to="/register">Register now!</Link></p>
                        </div>
                        <Button type="submit" onClick={(e) => {e.preventDefault(); handleLogin()}} className="bg-zinc-600 p-4 rounded-md hover:bg-zinc-500 duration-200 cursor-pointer font-bold">Login</Button>
                    </Field>
                </Fieldset>
            </form>

        </div>
    )
}