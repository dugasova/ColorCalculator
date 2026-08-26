import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export interface ProcessingTimerProps {
  minutes: number;
}

type TimerStatus = 'idle' | 'running' | 'paused';

// Safari-only vendor-prefixed AudioContext; no standard lib type declares it.
interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Two short ascending beeps via Web Audio — no external asset needed, and it still
// fires even if the tab is backgrounded (unlike a <audio> element that could be paused).
function playChime() {
  try {
    const webkitWindow = window as WebkitWindow;
    const AudioContextClass = window.AudioContext ?? webkitWindow.webkitAudioContext;
    if (AudioContextClass === undefined) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = now + i * 0.25;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch {
    // Web Audio unavailable — silent fallback, the visual/notification cues still fire.
  }
}

export function ProcessingTimer({ minutes }: ProcessingTimerProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(minutes * 60);
  const [syncedMinutes, setSyncedMinutes] = useState(minutes);
  const isDone = status === 'running' && remainingSeconds === 0;

  // Follow edits to the processing-time field while idle, right during render (no effect
  // needed): https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  // Leave an active/paused countdown alone.
  if (minutes !== syncedMinutes && status === 'idle') {
    setSyncedMinutes(minutes);
    setRemainingSeconds(minutes * 60);
  }

  // Ticking down is a genuine external-system subscription (setInterval), the textbook
  // use case for an effect; the setState call lives inside the interval callback, not
  // synchronously in the effect body.
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // Completion is derived (isDone above), not stored state, so this effect only fires
  // side effects (sound + notification) and never calls setState itself.
  useEffect(() => {
    if (!isDone) return;
    playChime();
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(t('results.timerDoneTitle'));
    }
  }, [isDone, t]);

  const handleStart = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    setStatus('running');
  };
  const handlePause = () => setStatus('paused');
  const handleResume = () => setStatus('running');
  const handleReset = () => {
    setStatus('idle');
    setRemainingSeconds(minutes * 60);
    setSyncedMinutes(minutes);
  };

  return (
    <div className={`processing-timer processing-timer--${isDone ? 'done' : status}`}>
      <div className="processing-timer__row">
        <span className="processing-timer__clock">{formatClock(remainingSeconds)}</span>
        <div className="processing-timer__controls">
          {status === 'idle' && (
            <button type="button" className="button button--secondary" onClick={handleStart}>{t('results.timerStart')}</button>
          )}
          {status === 'running' && !isDone && (
            <button type="button" className="button button--secondary" onClick={handlePause}>{t('results.timerPause')}</button>
          )}
          {status === 'paused' && (
            <button type="button" className="button button--secondary" onClick={handleResume}>{t('results.timerResume')}</button>
          )}
          {status !== 'idle' && (
            <button type="button" className="button button--secondary" onClick={handleReset}>{t('results.timerReset')}</button>
          )}
        </div>
      </div>
      {isDone && <p className="processing-timer__done">{t('results.timerDone')}</p>}
    </div>
  );
}
