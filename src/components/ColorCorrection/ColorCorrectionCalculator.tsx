import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { Level } from "../../engine/levels";
import { calculateColorCorrection, calculateCorrectorGrams, type UnwantedTone } from "../../engine/correction";
import "../FormulaCalculator/FormulaCalculator.css";
import "./ColorCorrectionCalculator.css";
import { NeutralizationWheel } from "./NeutralizationWheel";
import { TONES, TONE_COLORS } from "./toneColors";

const LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function getTipKey(tone: UnwantedTone, technique: 'deposit' | 'lift-tone' | 'multi-step'): string {
  if (technique === 'multi-step') {
    if (tone === 'red') return 'correction.tips.redMultiStep';
    if (tone === 'green') return 'correction.tips.greenMultiStep';
    return '';
  }
  if (tone === 'orange') return 'correction.tips.orange';
  if (tone === 'yellow') return 'correction.tips.yellow';
  return 'correction.tips.generic';
}

const TECHNIQUE_KEYS = {
  deposit: 'correction.techniques.deposit',
  'lift-tone': 'correction.techniques.liftTone',
  'multi-step': 'correction.techniques.multiStep',
} as const;

export function ColorCorrectionCalculator() {
  const { t } = useTranslation();
  const [currentLevel, setCurrentLevel] = useState<Level>(6);
  const [targetLevel, setTargetLevel] = useState<Level>(8);
  const [unwantedTone, setUnwantedTone] = useState<UnwantedTone>('orange');
  const [baseGrams, setBaseGrams] = useState(30);

  const result = calculateColorCorrection(currentLevel, targetLevel, unwantedTone);
  const correctorGrams = calculateCorrectorGrams(targetLevel, baseGrams);
  const correctorColorName = t(`correction.tones.${result.corrector.color}`);
  const correctorName = t('correction.correctorName', { color: correctorColorName, qualifier: t(`correction.qualifiers.${result.corrector.qualifier}`) });
  const unwantedToneName = t(`correction.tones.${unwantedTone}`);
  const tipKey = getTipKey(unwantedTone, result.technique);

  return (
    <div className="calculator calculator--wide">
      <h1 className="calculator__title">{t('correction.titlePrefix')} <span className="calculator__title-accent">{t('correction.titleAccent')}</span></h1>
      <p className="correction__subtitle">{t('correction.subtitle')}</p>

      <div className="calculator__form">
        <div className="field">
          <label htmlFor="currentLevel">{t('correction.currentLevel')}</label>
          <select
            name="currentLevel"
            id="currentLevel"
            value={currentLevel}
            onChange={e => setCurrentLevel(Number(e.target.value) as Level)}>
            {LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="targetLevel">{t('correction.targetLevel')}</label>
          <select
            name="targetLevel"
            id="targetLevel"
            value={targetLevel}
            onChange={e => setTargetLevel(Number(e.target.value) as Level)}>
            {LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div className="field correction__tone-field">
          <label id="unwantedToneLabel">{t('correction.unwantedTone')}</label>
          <div className="tone-grid" role="radiogroup" aria-labelledby="unwantedToneLabel">
            {TONES.map(tone => (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={unwantedTone === tone}
                className={`tone-btn ${unwantedTone === tone ? 'tone-btn--active' : ''}`}
                style={{ '--tone-color': TONE_COLORS[tone] } as CSSProperties}
                onClick={() => setUnwantedTone(tone)}
              >
                <span className="tone-dot" />
                <span>{t(`correction.tones.${tone}`)}</span>
              </button>
            ))}
          </div>
        </div>

        <NeutralizationWheel
          tones={TONES}
          toneColors={TONE_COLORS}
          selectedTone={unwantedTone}
          onSelectTone={setUnwantedTone}
        />

        <div className="field">
          <label htmlFor="baseGrams">{t('correction.baseGrams')}</label>
          <input
            type="number"
            id="baseGrams"
            min={1}
            value={baseGrams}
            onChange={e => setBaseGrams(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="results">
        <div className="results__stats">
          <div className="stat">
            <span className="stat__label">{t('correction.stats.developer')}</span>
            <span className="stat__value">{t('correction.developerValue', { volume: result.developer.volume, percent: result.developer.percent })}</span>
          </div>
          <div className="stat">
            <span className="stat__label">{t('correction.stats.technique')}</span>
            <span className="stat__value correction__stat-value--small">{t(TECHNIQUE_KEYS[result.technique])}</span>
          </div>
          <div className="stat">
            <span className="stat__label">{t('correction.stats.corrector')}</span>
            <span className="stat__value correction__stat-value--small">{correctorName}</span>
          </div>
          <div className="stat">
            <span className="stat__label">{t('correction.stats.reflection')}</span>
            <span className="stat__value">{result.corrector.reflections.join(', ')}</span>
          </div>
        </div>

        <div className="results__row">
          <span className="results__row-label">{t('correction.ruleOfTen.label')}</span>
          <span>{t('correction.ruleOfTen.value', { correctorGrams, baseGrams })}</span>
        </div>
        <p className="correction__explanation">{t('correction.ruleOfTen.explanation', { level: targetLevel })}</p>

        <p className="correction__explanation">
          {t('correction.explanation', { corrector: correctorName, tone: unwantedToneName })}
        </p>

        {result.technique === 'multi-step' && (
          <p className="correction__note">{t('correction.tips.multiStep')}</p>
        )}
        {tipKey !== '' && (
          <p className="correction__note">{t(tipKey)}</p>
        )}

        <p className="correction__note correction__note--strand">{t('correction.strandTest')}</p>
        <p className="correction__disclaimer">{t('correction.disclaimer')}</p>
      </div>
    </div>
  );
}
