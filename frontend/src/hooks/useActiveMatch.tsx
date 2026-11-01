import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Match } from "../util/NetworkModels"
import { api } from "../util/helpers";
import { useLocation } from "react-router";
import { useAuth } from "./useAuth";

const ActiveMatchContext = createContext<{
    activeMatch: Match | null;
    refreshActiveMatch: () => Promise<void>;
} | null>(null)

export function ActiveMatchProvider({ children }: { children: ReactNode }) {
    const [activeMatch, setActiveMatch] = useState<Match | null>(null);
    const { user } = useAuth();
    const location = useLocation();

    async function refreshActiveMatch() {
        return api<Match>("/users/me/active-match")
        .then(match => {
            setActiveMatch(match)
        }).catch(() => {
            setActiveMatch(null)
        })
    }

    useEffect(() => {
        refreshActiveMatch()
    }, [location.pathname, user?.id])

    return (
        <ActiveMatchContext.Provider value={{ activeMatch, refreshActiveMatch }}>
            {children}
        </ActiveMatchContext.Provider>
    )
}

export function useActiveMatch() {
    const ctx = useContext(ActiveMatchContext);
    if (!ctx) throw new Error("useActiveMatch must be used inside ActiveMatchProvider");
    return ctx;
}