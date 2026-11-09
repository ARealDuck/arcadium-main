import type { MilestoneLadder } from "./MiscInterfaces";

export const bmsAACollector: MilestoneLadder = [
    { tierName: "Copper", value: 5 },
    { tierName: "Bronze", value: 25 },
    { tierName: "Silver", value: 75 },
    { tierName: "Gold", value: 150 },
    { tierName: "Platinum", value: 250 },
    { tierName: "Emerald", value: 400 },
    { tierName: "Diamond", value: 575 },
    { tierName: "Master", value: 775 },
    { tierName: "Grandmaster", value: 1000 }
]

export const bmsVeteran: MilestoneLadder = [
    { tierName: "Copper", value: 5 },
    { tierName: "Bronze", value: 25 },
    { tierName: "Silver", value: 75 },
    { tierName: "Gold", value: 150 },
    { tierName: "Platinum", value: 250 },
    { tierName: "Emerald", value: 400 },
    { tierName: "Diamond", value: 575 },
    { tierName: "Master", value: 775 },
    { tierName: "Grandmaster", value: 1000 }
]

export function GetRatingForCount(count: number, milestoneLadder: MilestoneLadder): MilestoneLadder[number] | undefined {
    return milestoneLadder.findLast(t => count >= t.value)
}

export function GetNextTier(count: number, milestoneLadder: MilestoneLadder): MilestoneLadder[number] | null {
    for (let i = 0; i < milestoneLadder.length-1; i++) {
        if (count < milestoneLadder[i].value)
            return milestoneLadder[i]
    }

    return null;
}

