import { Button, Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react"
import { CornerDownRight } from "lucide-react"
import { ladder } from "../../util/dictionaryCorrections"
import { cn } from "../../util/helpers"
import type { ProfileRating } from "../../util/NetworkModels"

interface ProfileGameTabsProps {
    ratings: ProfileRating[];
    currentLadder: string;
    setNewLadder: (value: string) => void;
}

export default function ProfileGameTabs({ ratings, currentLadder, setNewLadder } : ProfileGameTabsProps) {
    return (
        <TabGroup className="mt-2">
            <TabList>
                <Tab className="font-archivo uppercase p-5 bg-background-dark border border-zinc-500/30 rounded-t-2xl tracking-[0.2em] border-b-highlight border-b-2 focus:outline-none">BMS 7K</Tab>
            </TabList>

            <TabPanels>
                <TabPanel className="p-5 bg-background-dark border border-zinc-500/30 flex flex-row gap-4 items-center">
                    <CornerDownRight className="hidden lg:flex text-zinc-700"/>
                    <p className="hidden lg:flex font-archivo text-subtext tracking-[0.2em] text-sm">LADDER</p>
                    <div className="flex flex-row gap-2 bg-foreground p-2 rounded-md border-zinc-500/40 border">
                        {
                            ratings.map(rating => {
                                let selected = rating.ladder == currentLadder

                                return (
                                <Button 
                                className={cn("font-archivo tracking-wide p-3 rounded-md uppercase", selected ? "bg-highlight" : "hover:bg-zinc-500/50 cursor-pointer")}
                                onClick={!selected ? () => setNewLadder(rating.ladder) : () => {}}
                                >{ladder[rating.ladder]}</Button>
                                )
                            })
                        }
                    </div>
                </TabPanel>
            </TabPanels>
        </TabGroup>
    )
}