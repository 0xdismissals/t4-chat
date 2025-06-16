import { useLiveQuery } from "dexie-react-hooks";
import { models as staticModels, Model } from "@/data/models";
import { db } from "@/data/db";
import { useMemo } from "react";

/**
 * A custom hook that returns a memoized list of all available models,
 * combining the static models with any user-defined custom models
 * from the database.
 * 
 * @returns {Model[]} An array of all available models.
 */
export const useAllModels = (): Model[] => {
    const customModels = useLiveQuery(() => db.customModels.toArray(), []);

    const allModels = useMemo(() => {
        if (customModels) {
            // Combine and remove any potential duplicates from static models if IDs match
            const all = [...staticModels];
            const customModelIds = new Set(customModels.map(m => m.id));
            const filteredStatic = all.filter(m => !customModelIds.has(m.id));
            return [...filteredStatic, ...customModels];
        }
        return staticModels;
    }, [customModels]);

    return allModels;
}; 