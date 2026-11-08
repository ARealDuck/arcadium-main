import { Button } from "@headlessui/react";
import type { ReactNode } from "react";
import { cn } from "../../util/helpers";

export default function ArcButton({ children, className, disabled, onClick }: { children: ReactNode; className?: string; disabled?: boolean; onClick?: () => void }) {
    return (
        <Button
            disabled={disabled}
            className={cn("justify-center font-sanchez inline-flex items-center gap-2 bg-highlight brightness-80 enabled:hover:brightness-100 duration-200 cursor-pointer p-3 rounded-sm font-semibold data-disabled:opacity-50 data-disabled:cursor-not-allowed", className)}
            onClick={onClick}
        >
            {children}
        </Button>
    )
}