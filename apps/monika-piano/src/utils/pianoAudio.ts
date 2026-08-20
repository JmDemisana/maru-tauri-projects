// Web Audio polyphonic piano synthesizer with resource-efficient scheduling and auto node cleanup.

import { getMonikaKeyByMidi, type MonikaPianoKey } from "./monikaPiano";

class PianoSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeVoices: { stop: () => void }[] = [];

  private init() {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();

        // Studio Dynamics Compressor / Limiter to prevent clipping during fast successive notes
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        compressor.knee.setValueAtTime(24, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
        compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

        this.masterGain.connect(compressor);
        compressor.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playNote(midiPitch: number, durationSec = 1.2, velocity = 0.8) {
    this.scheduleNote(midiPitch, 0, durationSec, velocity);
  }

  scheduleNote(midiPitch: number, delaySec = 0, durationSec = 1.4, velocity = 0.8) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const key = getMonikaKeyByMidi(midiPitch);
    const freq = key ? key.frequency : 440 * Math.pow(2, (midiPitch - 69) / 12);
    const startTime = this.ctx.currentTime + Math.max(0, delaySec);

    // Natural acoustic piano decay: lower notes ring longer, higher notes slightly shorter
    const baseDecay = Math.max(0.85, Math.min(2.2, (84 - midiPitch) * 0.04 + 1.1));
    const effectiveDuration = Math.max(durationSec, baseDecay);

    // Dynamic voice gain envelope with natural piano hammer strike and gentle exponential fade out
    const voiceGain = this.ctx.createGain();
    const velFactor = Math.min(1.0, Math.max(0.2, velocity));
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.exponentialRampToValueAtTime(0.32 * velFactor, startTime + 0.006); // Fast responsive attack
    voiceGain.gain.exponentialRampToValueAtTime(0.18 * velFactor, startTime + 0.05);  // Soundboard body
    voiceGain.gain.exponentialRampToValueAtTime(0.06 * velFactor, startTime + 0.30);  // Resonance
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + effectiveDuration); // Smooth tail

    voiceGain.connect(this.masterGain);

    // Fundamental (warm triangle)
    const osc1 = this.ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(freq, startTime);

    // 2nd harmonic (sine)
    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.35, startTime);
    osc2Gain.gain.exponentialRampToValueAtTime(0.0001, startTime + effectiveDuration * 0.7);
    osc2.connect(osc2Gain);
    osc2Gain.connect(voiceGain);

    // 3rd harmonic (sine, piano hammer sparkle)
    const osc3 = this.ctx.createOscillator();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(freq * 3, startTime);

    const osc3Gain = this.ctx.createGain();
    osc3Gain.gain.setValueAtTime(0.12, startTime);
    osc3Gain.gain.exponentialRampToValueAtTime(0.0001, startTime + effectiveDuration * 0.4);
    osc3.connect(osc3Gain);
    osc3Gain.connect(voiceGain);

    osc1.connect(voiceGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    const stopTime = startTime + effectiveDuration + 0.05;
    osc1.stop(stopTime);
    osc2.stop(stopTime);
    osc3.stop(stopTime);

    // Clean up Web Audio node graph from memory after note release
    const cleanTimer = setTimeout(() => {
      try {
        osc1.disconnect();
        osc2.disconnect();
        osc2Gain.disconnect();
        osc3.disconnect();
        osc3Gain.disconnect();
        voiceGain.disconnect();
      } catch {}
    }, (delaySec + effectiveDuration + 0.25) * 1000);

    const voiceEntry = {
      stop: () => {
        clearTimeout(cleanTimer);
        try {
          voiceGain.gain.setValueAtTime(0.0001, this.ctx?.currentTime || 0);
          osc1.stop();
          osc2.stop();
          osc3.stop();
          osc1.disconnect();
          osc2.disconnect();
          osc2Gain.disconnect();
          osc3.disconnect();
          osc3Gain.disconnect();
          voiceGain.disconnect();
        } catch {}
      },
    };

    this.activeVoices.push(voiceEntry);
  }

  playKey(key: MonikaPianoKey, durationSec = 0.6) {
    this.playNote(key.midi, durationSec);
  }

  stopAll() {
    this.activeVoices.forEach((v) => v.stop());
    this.activeVoices = [];
  }

  suspend() {
    this.stopAll();
    if (this.ctx && this.ctx.state === "running") {
      this.ctx.suspend().catch(() => {});
    }
  }
}

export const pianoSynth = new PianoSynthesizer();

