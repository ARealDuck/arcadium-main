import { TABLE_NAMES } from "../../util/dictionaryCorrections";
import { cn } from "../../util/helpers";
import type { TableWinrate } from "../../util/NetworkModels";
import ForegroundCard from "../General/ForegroundCard";
import ProfileIndividualTableProgress from "./ProfileIndividualTableProgress";

interface ProfileTableWinrateProps {
    className?: string;
    table_winrate: TableWinrate[]
}

export default function ProfileTableWinrate({ className, table_winrate }: ProfileTableWinrateProps) {
    return (
        <ForegroundCard className={cn("flex flex-col gap-4", className)}>
            <p className="font-archivo text-subtext tracking-[0.2em]">WIN RATE BY TABLE</p>
            
            {
                table_winrate.map(table => (
                    <ProfileIndividualTableProgress 
                    tableIcon={table.table_icon}
                    tableName={TABLE_NAMES[table.table_icon]}
                    games={table.games}
                    wins={table.wins}
                    />
                ))
            }

            
        </ForegroundCard>
    )
}