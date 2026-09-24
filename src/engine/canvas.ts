import { z } from "zod";

export type Porosity = "low" | "normal" | "high";
export type HairThickness = "fine" | "medium" | "coarse";
export type ChemicalHistory = "keratin" | "perm" | "henna" | "direct_dye";

export interface HairCanvas {
  porosity: Porosity;
  thickness: HairThickness;
  chemicalHistory: ChemicalHistory[];
}

export function createDefaultCanvas(): HairCanvas {
  return {
    porosity: "normal",
    thickness: "medium",
    chemicalHistory: [],
  };
}

// Shallow runtime shape for HairCanvas, shared by every Firestore read that stores one
// (a history entry's steps, a client profile's lastCanvas) so the two can't drift apart.
export const canvasShapeSchema = z.object({
  porosity: z.enum(["low", "normal", "high"]),
  thickness: z.enum(["fine", "medium", "coarse"]),
  chemicalHistory: z.array(z.enum(["keratin", "perm", "henna", "direct_dye"])),
});
