export type CIFactorType = "direct" | "lifecycle" | "unknown";
export type CISource = "electricitymaps" | "uk-national-grid" | "static";

export interface LiveCarbonData {
    currentCI: number;
    index: string;
    isLive: boolean;
    updatedAt: string;
    source: CISource;
    factorType: CIFactorType;
    zone: string | null;
    zoneLabel: string | null;
    isRepresentativeZone: boolean;
}

export interface GreenHoursSlot {
    from: string;
    to: string;
    ci: number;
    index: string;
}

export interface GreenHoursData {
    slots: GreenHoursSlot[];
    bestSlot: GreenHoursSlot | null;
    worstSlot: GreenHoursSlot | null;
    currentCI: number;
    savingPercent: number;
}
