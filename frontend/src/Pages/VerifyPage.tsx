import { Link, useSearchParams } from "react-router"
import ForegroundCard from "../Components/General/ForegroundCard";
import { useAuth } from "../hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { api } from "../util/helpers";

export default function VerifyPage() {
    const { user, loading, refresh } = useAuth();
    const [verifyLoading, setVerifyLoading] = useState<boolean>(false)
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token")
    const [message, setMessage] = useState<string>()
    const sent = useRef(false);

    useEffect(() => {
        const verifyEmail = async () => {
        if (sent.current || !token) return;
        sent.current = true;
            try {
                setVerifyLoading(true)
                await api(`/auth/me/verify?token=${token}`, { method: "POST" })
                refresh()
                setVerifyLoading(false)

            } catch (err) {
                setMessage(err instanceof Error ? err.message : "Something went wrong")
            }
        }

        verifyEmail()
    }, [])

    if (message)
        return (
        <div className="flex justify-center">
            <ForegroundCard className="mt-5 w-5/6 text-center text-subtext font-sanchez">
            <p>
                {message}
            </p>
            </ForegroundCard>
        </div>  
        )

    if (loading || verifyLoading)
        return (
        <div className="flex justify-center">
            <ForegroundCard className="mt-5 w-5/6 text-center text-subtext font-sanchez">
            <p>
                Loading...
            </p>
            </ForegroundCard>
        </div>  
        )
    
    if (!user)
        return (
        <div className="flex justify-center">
            <ForegroundCard className="mt-5 w-5/6 text-center text-subtext font-sanchez">
            <p>
                You are not logged in!
            </p>
            </ForegroundCard>
        </div>   
        )

    return (
        <div className="flex justify-center">
            <ForegroundCard className="mt-5 w-5/6 text-center text-subtext font-sanchez">
            <p>
                Your email is now verified! <Link to="/" className="text-highlight">Click here</Link> to return to the site
            </p>
            </ForegroundCard>
        </div>
    )
}