import { useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { getComplementaryCorrector, type UnwantedTone } from "../../engine/correction";

export interface NeutralizationWheelProps {
  tones: UnwantedTone[];
  toneColors: Record<UnwantedTone, string>;
  selectedTone: UnwantedTone;
  onSelectTone: (tone: UnwantedTone) => void;
}

const WHEEL_SIZE = 220;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = WHEEL_SIZE / 2 - 4;
const WEDGE_SPAN_DEG = 60;

// angle 0 = 12 o'clock, increasing clockwise -- matches how printed hairdressing color
// wheels are conventionally drawn.
function polarPoint(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) };
}

function wedgePath(centerAngle: number): string {
  const start = polarPoint(centerAngle - WEDGE_SPAN_DEG / 2, RADIUS);
  const end = polarPoint(centerAngle + WEDGE_SPAN_DEG / 2, RADIUS);
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y} Z`;
}

// A read-mostly, hover-reactive illustration of the classic complementary color wheel
// (see COMPLEMENTARY_CORRECTORS in correction.ts): each of the 6 unwanted-tone wedges sits
// exactly opposite the wedge that neutralizes it -- red opposite green, orange opposite
// blue, yellow opposite violet -- so "opposite on the wheel" and "neutralizes" are always
// the same relationship here, unlike an arbitrary layout. Hovering any wedge previews that
// pairing (both wedges light up, a line connects them, the label below explains it); with
// nothing hovered it falls back to the currently selected tone's own pairing.
//
// The tone-grid buttons in ColorCorrectionCalculator remain the accessible/keyboard-
// operable selection control -- this wheel is a supplementary, hover-driven illustration
// (aria-hidden, since a screen-reader user has no way to hover it and the results panel
// already announces the same explanation for whatever tone is actually selected); clicking
// a wedge is still wired to the same selection as a convenience for pointer users.
export function NeutralizationWheel({ tones, toneColors, selectedTone, onSelectTone }: NeutralizationWheelProps) {
  const { t } = useTranslation();
  const [hoveredTone, setHoveredTone] = useState<UnwantedTone | null>(null);
  const activeTone = hoveredTone ?? selectedTone;
  const activeCorrector = getComplementaryCorrector(activeTone);
  const complementTone = activeCorrector.color;

  const angleOf = (tone: UnwantedTone) => tones.indexOf(tone) * WEDGE_SPAN_DEG;

  const activeToneName = t(`correction.tones.${activeTone}`);
  const complementColorName = t(`correction.tones.${complementTone}`);
  const complementName = t('correction.correctorName', {
    color: complementColorName,
    qualifier: t(`correction.qualifiers.${activeCorrector.qualifier}`),
  });

  const lineStart = polarPoint(angleOf(activeTone), RADIUS);
  const lineEnd = polarPoint(angleOf(complementTone), RADIUS);

  return (
    <div className="neutralization-wheel" aria-hidden="true">
      <p className="neutralization-wheel__title">{t('correction.wheelTitle')}</p>
      <svg
        className="neutralization-wheel__svg"
        viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
        onMouseLeave={() => setHoveredTone(null)}
      >
        <line
          className="neutralization-wheel__link"
          x1={lineStart.x}
          y1={lineStart.y}
          x2={lineEnd.x}
          y2={lineEnd.y}
        />
        {tones.map(tone => {
          const active = tone === activeTone || tone === complementTone;
          return (
            <path
              key={tone}
              d={wedgePath(angleOf(tone))}
              fill={toneColors[tone]}
              className={clsx('neutralization-wheel__wedge', active && 'neutralization-wheel__wedge--active')}
              onMouseEnter={() => setHoveredTone(tone)}
              onClick={() => onSelectTone(tone)}
            />
          );
        })}
        <circle className="neutralization-wheel__hub" cx={CENTER} cy={CENTER} r={RADIUS * 0.28} />
      </svg>
      <p className="neutralization-wheel__label">
        {t('correction.explanation', { corrector: complementName, tone: activeToneName })}
      </p>
    </div>
  );
}
