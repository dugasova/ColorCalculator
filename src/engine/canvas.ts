export type Porosity = 'low' | 'normal' | 'high';
export type HairThickness = 'fine' | 'medium' | 'coarse';
export type ChemicalHistory = 'keratin' | 'perm' | 'henna' | 'direct_dye';

export interface HairCanvas {
  porosity: Porosity;
  thickness: HairThickness;
  chemicalHistory: ChemicalHistory[];
}

export function createDefaultCanvas(): HairCanvas {
  return {
    porosity: 'normal',
    thickness: 'medium',
    chemicalHistory: [],
  };
}
