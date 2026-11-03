export type User = { 
    id: number; 
    username: string; 
    display_name: string; 
    avatar_url: string | null,
    has_tachi_key: boolean, 
    onboarded_at: Date | null;
    email_verified: boolean;
};

export interface UserRating {
    ladder: string;
    display_rating: number;
    placed: boolean;
    games_played: number;
    rank: number;
    total: number;
    wins: number;
    losses: number; 
    selected_tables: string[];
}

export interface MatchSubmit {
    message: string;
    job_id: number;
}

export interface ChartRating {
    ladder: string;
    rating: number;
    rd: number;
    games_played: number;
    wins: number;
}

export interface ChartTableLevel {
    table_icon: string;
    table_level: string;
}

export interface SieglindeCalculations {
    elo_floor: number;
    elo_base: number;
    elo_per_level: number
}

export interface TierData {
    tiers: Tier[];
    sieg_calc: SieglindeCalculations;
}

export interface Tier {
    name: string;
    floor: number;
}

export interface CanQueue {
    can_queue: boolean
}

export interface Job<T = unknown> {
    id: number;
    status: "pending" | "running" | "done" | "failed";
    result: T;
    error: string | null;
}

export interface JobResultMatchSubmit {
    result: string | null;
    match_id: number;
}

export interface Chart {
    chart_id: string;
    md5: string;
    title: string;
    artist: string;
    subtitle: string | null;
    sg_ec: number | null;
    sg_hc: number | null;
    ratings: ChartRating[];
    table_levels: ChartTableLevel[];
}

export interface Match {
    id: number;
    user: User;
    chart: Chart;
    score: MatchScore | null;
    rating_change: number | null;
    ladder: string;
    game: string;
    playtype: string;
    result: string | null;
    status: string;
    type: string;
    search_elo: number | null;
    cancel_reason: string | null;
    player_placed_before: boolean;
    player_display_before: number;
    player_display_after: number | null;
    chart_rating_before: number;
    chart_rating_after: number | null;
    start_time: string;
    cutoff_time: string;
    end_time: string | null;
    potential_gain: number;
    potential_loss: number;
}

export interface MatchScore {
    id: number;
    lamp: string;
    grade: string;
    percent: number;
    bp: number;
}

export type TableCounts = Record<string, number>;

interface ProfileGeneric {
    display_name: string;
    join_date: string;
}

export interface ProfileRating {
    game: string;
    playtype: string;
    ladder: string;
    display_rating: number;
    placed: boolean;
    games_played: number;
    wins: number;
    peak_rating: number;
}

export interface TableWinrate {
    table_icon: string;
    games: number;
    wins: number;
}

export interface RatingPoint {
    date: string;
    rating: number;
}

export interface LadderStats {
    rating_series: RatingPoint[];
    matches: Match[];
    activity: Record<string, number>;
    lamp_counts: Record<string, number>;
}

interface BMSProfile {
    num_aa: number;
    table_winrate: TableWinrate[]
}

export interface UserProfileInfo {
    generic: ProfileGeneric
    ratings: ProfileRating[]
    ladder_stats?: LadderStats;
    rating_rank?: number
    rating_total?: number
    last_played?: string | null;
    bms?: BMSProfile
}