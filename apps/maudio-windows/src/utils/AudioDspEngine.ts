/**
 * Real-time DSP Vocal Stem Attenuation & Karaoke Filter Engine
 * Uses Web Audio API center-channel phase cancellation and multi-band frequency filtering.
 */
export class AudioDspEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private vocalGainNode: GainNode | null = null;
  private instGainNode: GainNode | null = null;
  private bassFilterNode: BiquadFilterNode | null = null;
  private vocalFilterNode: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized = false;
  private mediaStream: MediaStream | null = null;

  public init(audioEl?: HTMLAudioElement): AudioContext {
    if (this.ctx && this.ctx.state !== "closed") {
      return this.ctx;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 64;

    this.vocalGainNode = this.ctx.createGain();
    this.instGainNode = this.ctx.createGain();

    // Bass punch low-shelf filter (80Hz - 250Hz)
    this.bassFilterNode = this.ctx.createBiquadFilter();
    this.bassFilterNode.type = "lowshelf";
    this.bassFilterNode.frequency.value = 180;
    this.bassFilterNode.gain.value = 0;

    // Center-vocal bandpass filter (200Hz - 4500Hz)
    this.vocalFilterNode = this.ctx.createBiquadFilter();
    this.vocalFilterNode.type = "peaking";
    this.vocalFilterNode.frequency.value = 1400;
    this.vocalFilterNode.Q.value = 0.8;
    this.vocalFilterNode.gain.value = 0;

    if (audioEl) {
      this.audioElement = audioEl;
      this.sourceNode = this.ctx.createMediaElementSource(audioEl);
      this.buildGraph(this.sourceNode);
    }

    this.isInitialized = true;
    return this.ctx;
  }

  public async captureSystemAudio(): Promise<boolean> {
    try {
      if (!this.ctx) {
        this.init();
      }
      if (this.ctx?.state === "suspended") {
        await this.ctx.resume();
      }

      // Capture system / window loopback audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Stop video track since we only process audio
      stream.getVideoTracks().forEach((track) => track.stop());

      if (stream.getAudioTracks().length === 0) {
        throw new Error("No audio track selected in capture");
      }

      this.mediaStream = stream;
      this.sourceNode = this.ctx!.createMediaStreamSource(stream);
      this.buildGraph(this.sourceNode);
      return true;
    } catch (e) {
      console.warn("System audio capture not granted or canceled:", e);
      return false;
    }
  }

  private buildGraph(source: AudioNode) {
    if (!this.ctx || !this.vocalGainNode || !this.instGainNode || !this.bassFilterNode || !this.analyserNode) {
      return;
    }

    // Split stereo channels
    const splitter = this.ctx.createChannelSplitter(2);
    const merger = this.ctx.createChannelMerger(2);

    source.connect(splitter);

    // Left - Right = Instrumental Stereo Difference (Center Vocal Cancellation)
    const invRightGain = this.ctx.createGain();
    invRightGain.gain.value = -1.0;

    const diffLeftGain = this.ctx.createGain();
    diffLeftGain.gain.value = 0.5;

    const diffRightGain = this.ctx.createGain();
    diffRightGain.gain.value = 0.5;

    // Left -> diffLeft
    splitter.connect(diffLeftGain, 0);
    // Right -> Invert -> diffLeft (giving L - R)
    splitter.connect(invRightGain, 1);
    invRightGain.connect(diffLeftGain);

    // Instrumental side output
    diffLeftGain.connect(this.instGainNode);
    this.instGainNode.connect(merger, 0, 0); // Out Left

    // Inverted difference for Out Right (R - L)
    const invDiffGain = this.ctx.createGain();
    invDiffGain.gain.value = -1.0;
    diffLeftGain.connect(invDiffGain);
    invDiffGain.connect(this.instGainNode);
    this.instGainNode.connect(merger, 0, 1); // Out Right

    // Center Channel = (L + R) * 0.5 (Lead Vocals)
    const centerSum = this.ctx.createGain();
    centerSum.gain.value = 0.5;
    splitter.connect(centerSum, 0);
    splitter.connect(centerSum, 1);

    centerSum.connect(this.vocalGainNode);
    this.vocalGainNode.connect(merger, 0, 0);
    this.vocalGainNode.connect(merger, 0, 1);

    // Route merged audio through Bass punch filter and Analyser to speakers
    merger.connect(this.bassFilterNode);
    this.bassFilterNode.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);
  }

  public setVocalLevel(levelPercent: number) {
    if (!this.vocalGainNode || !this.ctx) return;
    const gain = Math.max(0, Math.min(1.5, levelPercent / 100));
    this.vocalGainNode.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.05);
  }

  public setInstrumentalLevel(levelPercent: number) {
    if (!this.instGainNode || !this.ctx) return;
    const gain = Math.max(0, Math.min(1.5, levelPercent / 100));
    this.instGainNode.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.05);
  }

  public setBassPunch(punchPercent: number) {
    if (!this.bassFilterNode || !this.ctx) return;
    // 100% is 0dB, 150% is +8dB, 50% is -6dB
    const dbGain = ((punchPercent - 100) / 50) * 8;
    this.bassFilterNode.gain.setTargetAtTime(dbGain, this.ctx.currentTime, 0.05);
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(32);
    const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(buffer);
    return buffer;
  }

  public destroy() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.isInitialized = false;
  }
}
