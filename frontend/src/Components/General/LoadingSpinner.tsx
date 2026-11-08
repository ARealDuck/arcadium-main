import { LoaderCircle } from "lucide-react";
import { cn } from "../../util/helpers";

export default function LoadingSpinner({ className } : { className?: string }) {
    return (
        <LoaderCircle className={cn("m-auto size-4 animate-spin text-highlight/50", className)} />
    )
}