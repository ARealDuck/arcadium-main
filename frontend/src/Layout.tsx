import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown, ChevronRight, MenuIcon, X } from "lucide-react";
import { Link, Outlet, useLocation, useMatch } from "react-router";
import UserButton from "./Components/Navigation/UserButton";

import arcadiumTextLogo from './assets/Arcadium Logo Text.png';
import arcadiumIconLogo from './assets/Arcadium Logo Icon.png';
import { useAuth } from "./hooks/useAuth";
import { useEffect, useState } from "react";
import { type CanQueue, type Match } from "./util/NetworkModels";
import { api } from "./util/helpers";
import { ActiveMatchProvider, useActiveMatch } from "./hooks/useActiveMatch";

export default function Layout() {

    const {user, loading} = useAuth();
    const onMatchPage = useMatch("/match/:id");
    const { activeMatch } = useActiveMatch();

    const [canQueue, setCanQueue] = useState<CanQueue>({can_queue: false});

    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const location = useLocation();

    useEffect(() => {

        Promise.all([
        api<CanQueue>("/users/me/can-queue")
        ])
        .then(([can_queue]) => {
            setCanQueue(can_queue)
        })
    }, [user])

    const sendVerifyEmail = async () => {
        try {
            await api("/auth/me/resend_verify", { method: "POST" })
        } catch (err) {
            console.log(err)
        }
    }

    return (
        <div className="min-h-dvh flex flex-col">
            <Disclosure key={location.pathname} as="nav" className="font-sanchez bg-background-dark lg:hidden font-bold tracking-wider p-7 border-b border-highlight items-center">
                <div className="flex flex-row gap-20 items-center p-4">
                    <Link to="/" className="mr-auto flex flex-row items-center gap-2">
                            <img src={arcadiumIconLogo} alt="Arcadium Icon" className="h-15"/>
                            <img src={arcadiumTextLogo} alt="Arcadium Text" className="h-16" />
                    </Link>
                    <DisclosureButton className="group p-2">
                        <MenuIcon className="size-6 group-data-open:hidden"/>
                        <X className="size-6 hidden group-data-open:block"/>
                    </DisclosureButton>
                </div>
                <DisclosurePanel transition className="flex flex-col transition ease-out data-closed:opacity-0 data-closed:-translate-y-2">
                    <Disclosure>
                    {activeMatch ? (
                        !onMatchPage && (
                            <Link
                            to={`/match/${activeMatch.id}`}
                            className="flex items-center gap-2 text-red-600 hover:text-red-400 transition-colors duration-150"
                            >
                                Return to Active Match
                            </Link>
                        )
                        ) :
                            canQueue.can_queue ?
                            <>
                                <DisclosureButton className="group focus:outline-none flex items-center gap-2 hover:text-highlight transition-colors duration-150 py-2">
                                Queue <ChevronDown className="size-6 scale-x-90 group-data-open:rotate-180 transition-transform duration-200" />
                                </DisclosureButton>
                                <DisclosurePanel className="flex flex-col pl-4 py-1">
                                        <Link to="/prep/bms/7k/ec" className="block duration-150 py-2">7K Easy Clear</Link>
                                        <Link to="/prep/bms/7k/hc" className="block duration-150 py-2">7K Hard Clear</Link>
                                </DisclosurePanel>
                            </> : <></>
                        }
                    </Disclosure>
                    <Disclosure>
                        <DisclosureButton className="group focus:outline-none flex items-center gap-2 hover:text-highlight transition-colors duration-150 py-2">
                        Rankings <ChevronDown className="size-6 scale-x-90 group-data-open:rotate-180 transition-transform duration-200" />
                        </DisclosureButton>
                        <DisclosurePanel className="flex flex-col pl-4 py-1">
                                <Link to="#" className="block duration-150 py-2">Players</Link>
                                <Link to="#" className="block duration-150 py-2">Charts</Link>
                        </DisclosurePanel>
                    </Disclosure>
                <Link className="hover:text-highlight duration-150 py-2" to="/">Tier Guide</Link>
                <Link className="hover:text-highlight duration-150 py-2" to="/">Quick Setup</Link>
                <Link className="hover:text-highlight duration-150 py-2" to="/">FAQ</Link>
                <div className="flex justify-end bg-zinc-50/20 rounded-md my-2">
                    <UserButton />
                </div>
                </DisclosurePanel>
            </Disclosure>
            <nav className="font-sanchez min-h-d bg-background-dark hidden lg:flex flex-row gap-20 font-bold tracking-wider p-7 border-b border-highlight items-center">
                <Link to="/" className="mr-auto flex flex-row items-center gap-2">
                        <img src={arcadiumIconLogo} alt="Arcadium Icon" className="h-18"/>
                        <img src={arcadiumTextLogo} alt="Arcadium Text" className="h-20" />
                </Link>
                {activeMatch ? (
                    !onMatchPage && (
                        <Link
                        to={`/match/${activeMatch.id}`}
                        className="flex items-center gap-2 text-red-600 hover:text-red-400 transition-colors duration-150"
                        >
                            Return to Active Match
                        </Link>
                    )
                    ) : (
                        <Menu>
                            {canQueue.can_queue ? 
                            <>
                            <MenuButton className="focus:outline-none flex items-center gap-2 hover:text-highlight transition-colors duration-150">
                            Queue <ChevronDown className="size-6 scale-x-90" />
                            </MenuButton>
                            <MenuItems
                            anchor={{ to: "bottom start", gap: 30}}
                            transition
                            className="focus:outline-none flex flex-col gap-6 bg-foreground p-5 rounded-md font-bold transition duration-150 ease-out data-closed:opacity-0 w-50"
                            >
                                <div className="px-1 text-xs uppercase tracking-widest text-muted">BMS</div>
                                <MenuItem>
                                    <Link to="/prep/bms/7k/ec" className="block data-focus:text-highlight duration-150">7K Easy Clear</Link>
                                </MenuItem>
                                <MenuItem>
                                    <Link to="/prep/bms/7k/hc" className="block data-focus:text-highlight duration-150">7K Hard Clear</Link>
                                </MenuItem>
                            </MenuItems></> : (<></>)      

                        }
                        </Menu>
                    )
                    }
                <Menu>
                    <MenuButton className="focus:outline-none flex items-center gap-2 hover:text-highlight transition-colors duration-150">
                        Rankings <ChevronDown className="size-6 scale-x-90" />   
                    </MenuButton>
                    <MenuItems
                    anchor={{ to: "bottom start", gap: 30}}
                    transition
                    className="focus:outline-none flex flex-col gap-6 bg-foreground p-5 rounded-md font-bold transition duration-150 ease-out data-closed:opacity-0 w-50"
                    >
                        <MenuItem>
                            <Link className="hover:text-highlight duration-150" to="/">Players</Link>
                        </MenuItem>
                        <MenuItem>
                            <Link className="hover:text-highlight duration-150" to="/">Charts</Link>
                        </MenuItem>
                    </MenuItems>
                </Menu>
                <Link className="hover:text-highlight duration-150" to="/">Tier Guide</Link>
                <Link className="hover:text-highlight duration-150" to="/">Quick Setup</Link>
                <Link className="hover:text-highlight duration-150" to="/">FAQ</Link>
                <div>
                    <UserButton />
                </div>
            </nav>
            {!user?.email_verified ? 
            <div className="p-3 bg-red-800/25 text-center font-sanchez">
                Please verify your email! If you didn't receive a verification link, <a className="text-highlight cursor-pointer" onClick={sendVerifyEmail}>click here</a> to send another.
            </div> : <></>      
            }

            <main className="flex-1 flex flex-col">
                <Outlet />
            </main>
        </div>

    )
}