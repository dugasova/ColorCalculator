import { useState } from 'react';
import type { HairCanvas, Porosity, HairThickness, ChemicalHistory } from '../../engine/canvas';
import { createDefaultCanvas } from '../../engine/canvas';

export function useHairCanvasState(initialCanvas?: HairCanvas) {
  const defaultCanvas = createDefaultCanvas();
  const [porosity, setPorosity] = useState<Porosity>(initialCanvas?.porosity ?? defaultCanvas.porosity);
  const [thickness, setThickness] = useState<HairThickness>(initialCanvas?.thickness ?? defaultCanvas.thickness);
  const [chemicalHistory, setChemicalHistory] = useState<ChemicalHistory[]>(initialCanvas?.chemicalHistory ?? defaultCanvas.chemicalHistory);

  return {
    porosity,
    setPorosity,
    thickness,
    setThickness,
    chemicalHistory,
    setChemicalHistory,
  };
}
