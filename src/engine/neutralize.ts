import type { UnderlyingPigment } from "./levels";
import type { ToneFamily } from "./shades";

export function suggestNeutralizingTone(pigment: UnderlyingPigment): ToneFamily {
  switch (pigment) {
    case "orange":
    case "orange-yellow":
      return "ash";
    case "yellow-orange":
    case "yellow":
    case "pale-yellow":
      return "violet";
    case "red":
    case "red-orange":
      return "matt";
    case "very-light-yellow":
      return "violet";

  }
}