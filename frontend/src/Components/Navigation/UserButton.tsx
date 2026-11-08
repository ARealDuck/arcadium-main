import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import ProfileImage from "./ProfileImage";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router";

export default function UserButton() {
    const { user, loading, logout } = useAuth();

    return loading ? (
        <></> ) : (
        <>
        <Menu>
            <MenuButton className="focus:outline-none flex items-center gap-5 hover:bg-amber-50/25 p-3 rounded-md transition-colors duration-150">
                <p className="font-light">Welcome,  
                    <span className="font-bold"> {user ? user.display_name : ""}</span>
                </p>

                <ProfileImage 
                displayName={user?.display_name}
                src={user?.avatar_url}
                />
            </MenuButton>

            <MenuItems
            anchor={{ to: "bottom start", gap: 30}}
            transition
            className="focus:outline-none flex flex-col gap-6 bg-foreground p-5 rounded-md font-bold transition duration-150 ease-out data-closed:opacity-0 w-50"
            >
                <MenuItem>
                    <Link className="hover:text-highlight duration-150" to={`/profile/${user?.id}`}>Profile</Link>
                </MenuItem>
                <MenuItem>
                    <Link className="hover:text-highlight duration-150" to={`/settings`}>Settings</Link>
                </MenuItem>
                <MenuItem>
                    <Link onClick={logout} className="hover:text-highlight duration-150" to="/">Log Out</Link>
                </MenuItem>
            </MenuItems>
        </Menu>
        </>
    )
}