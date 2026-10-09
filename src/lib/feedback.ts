let ctx: AudioContext | null = null;

function tone(frequency: number, durationMs: number, startOffsetMs = 0) {
  try {
    ctx ??= new AudioContext();
    const start = ctx.currentTime + startOffsetMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + durationMs / 1000 + 0.02);
  } catch {
    // Audio is a nice-to-have; ignore browsers that block it.
  }
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}

export function successFeedback() {
  tone(1180, 110);
  vibrate(60);
}

export function duplicateFeedback() {
  tone(420, 120);
  tone(320, 160, 140);
  vibrate([40, 60, 40]);
}
