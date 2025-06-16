export async function generateAndPlayAudio(
  apiKey: string,
  text: string,
  voiceId: string,
  onFinished?: () => void
): Promise<{ stop: () => void } | null> {
  if (!apiKey) {
    throw new Error("ElevenLabs API key is not set.");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API request failed with status ${response.status}`);
    }

    const audioContext = new AudioContext();
    const audioBufferSource = audioContext.createBufferSource();
    let isPlaying = true;

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    audioBufferSource.buffer = audioBuffer;
    audioBufferSource.connect(audioContext.destination);
    audioBufferSource.start(0);
    audioBufferSource.onended = () => {
      isPlaying = false;
      onFinished?.();
      audioContext.close();
    };

    const stop = () => {
      if (isPlaying) {
        audioBufferSource.stop();
        isPlaying = false;
        audioContext.close();
      }
    };
    
    return { stop };
  } catch (error) {
    console.error("Error generating or playing audio:", error);
    onFinished?.();
    return null;
  }
} 