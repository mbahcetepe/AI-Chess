/** WebAudio ile sentezlenmiş satranç sesleri (dosya/internet gerektirmez). */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean): void {
  enabled = v;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

function tone(freq: number, durationMs: number, type: OscillatorType, gain = 0.12, delayMs = 0): void {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + delayMs / 1000;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(start);
  osc.stop(start + durationMs / 1000 + 0.02);
}

export const sounds = {
  move: () => tone(320, 90, "sine", 0.1),
  capture: () => {
    tone(220, 110, "triangle", 0.13);
    tone(160, 130, "sine", 0.08, 30);
  },
  check: () => {
    tone(660, 90, "square", 0.08);
    tone(880, 110, "square", 0.07, 70);
  },
  castle: () => {
    tone(300, 80, "sine", 0.1);
    tone(400, 90, "sine", 0.1, 60);
  },
  gameStart: () => {
    tone(440, 100, "sine", 0.1);
    tone(587, 120, "sine", 0.1, 90);
  },
  gameEnd: () => {
    tone(523, 140, "sine", 0.11);
    tone(392, 160, "sine", 0.1, 120);
    tone(330, 220, "sine", 0.1, 260);
  },
  click: () => tone(500, 40, "sine", 0.05),
};
