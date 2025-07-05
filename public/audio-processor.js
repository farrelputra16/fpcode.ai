// public/audio-processor.js
// Note: AudioWorkletProcessor is available in the worklet scope
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // Reduced from 4096 to 2048 for faster response in successful project
    this.accumulatedSamples = new Float32Array(this.bufferSize);
    this.sampleCount = 0;

    // Output Warning jika sample rate tidak 16kHz, tapi Worklet tidak akan melakukan resampling
    // Asumsi AudioContext di main thread sudah 16kHz
    console.log(`AudioProcessor: Context Sample Rate: ${sampleRate}`);
    if (sampleRate !== 16000) {
      console.warn(`AudioProcessor: WARNING! Context sample rate (${sampleRate}Hz) is not 16000Hz. Resampling might be needed by API.`);
    }
  }

  process(inputs) {
    const input = inputs[0][0]; // Ambil channel pertama dari input pertama
    if (!input) return true;

    // Accumulate samples
    for (
      let i = 0;
      i < input.length && this.sampleCount < this.bufferSize;
      i++
    ) {
      this.accumulatedSamples[this.sampleCount++] = input[i];
    }

    // Process when we have enough samples
    if (this.sampleCount >= this.bufferSize) {
      const pcm16 = new Int16Array(this.bufferSize);
      let sum = 0;

      // Simple conversion from Float32 to Int16
      for (let i = 0; i < this.bufferSize; i++) {
        pcm16[i] = this.accumulatedSamples[i] * 0x7fff;
        sum += Math.abs(pcm16[i]); // Menggunakan Math.abs untuk RMS
      }

      const buffer = new ArrayBuffer(pcm16.byteLength);
      const view = new DataView(buffer);
      pcm16.forEach((value, index) => {
        view.setInt16(index * 2, value, true); // true for little-endian
      });

      // Simplified level calculation (0-100)
      const level = (sum / (this.bufferSize * 0x7fff)) * 100;

      this.port.postMessage(
        {
          pcmData: buffer, // Mengirim ArrayBuffer mentah
          level: Math.min(level * 5, 100), // Level untuk visualisasi
        },
        [buffer] // Penting: Transfer Ownership ArrayBuffer untuk performa
      );

      this.sampleCount = 0; // Reset
      // Tidak perlu menangani sisa data jika bufferSize cocok dengan input per process cycle
    }

    return true; // Harus selalu mengembalikan true agar Worklet tetap aktif.
  }
}

registerProcessor("audio-processor", AudioProcessor);