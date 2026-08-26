import type { UnderlyingPigment } from "./levels";
import type { ToneFamily } from "./shades";

export type CorrectorFamily = 'matt' | 'blue-green' | 'blue' | 'blue-violet' | 'violet' | 'silver' | 'slate-grey';


export function getNeutralizingCorrector(pigment: UnderlyingPigment): CorrectorFamily {
  switch (pigment) {
    case 'red':
      return 'matt';
    case 'red-orange':
      return 'matt';
    case 'orange':
      return 'blue';
    case 'orange-yellow':
      return 'blue-violet';
    case 'yellow-orange':
      return 'blue-violet';
    case 'yellow':
      return 'violet';
    case 'pale-yellow':
      return 'violet';
    case 'very-light-yellow':
      return 'violet';
  }
}
export function suggestNeutralizingTone(pigment: UnderlyingPigment): ToneFamily {
  switch (pigment) {
    case 'orange':
    case 'orange-yellow':
      return 'ash';
    case 'yellow-orange':
    case 'yellow':
    case 'pale-yellow':
      return 'violet';
    case 'red':
    case 'red-orange':
      return 'matt';
    case 'very-light-yellow':
      return 'violet';

  }
}