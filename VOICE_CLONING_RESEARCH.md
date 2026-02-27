# Voice Cloning Research for Dream Dairy

**Research Date:** February 26, 2026
**Requested by:** Ceci
**Purpose:** Add voice cloning feature to recreate someone's voice from video clips

---

## ✅ Yes, This Technology Exists & Is Mature!

Voice cloning from video is **absolutely possible** in 2025/2026. The technology has reached a point where:
- 90%+ accuracy with just 10-15 seconds of audio
- Works across 30+ languages
- Captures tone, pitch, accent, speaking style, cadence, and even pauses/breaths
- Production-ready APIs available

---

## 🏆 Best Solutions for Your Use Case

### 1. **ElevenLabs** (⭐ Recommended)
**Why it's perfect for dream-dairy:**
- ✅ **Instant Voice Clone (IVC):** 1 minute of audio → cloned voice
- ✅ **Professional Voice Clone (PVC):** 30+ minutes → highest quality
- ✅ **90%+ accuracy** from just a 10-second clip
- ✅ **Full API support** with JavaScript SDK
- ✅ **Works from video** (you extract audio first)

**API Endpoint:**
```
POST https://api.elevenlabs.io/v1/voices/add
```

**Pricing:**
- Free tier: Limited characters per month
- Starter: $5/month (30k characters)
- Creator: $22/month (100k characters)
- Pro: $99/month (500k characters)
- **API-only plans:** Pay-as-you-go starting at $330/month (500k credits)

**Special Discount (until June 30, 2025):**
Eleven v3 model costs **80% fewer credits** during alpha period!

### 2. **PlayHT** (Alternative)
- Supports 15-second clips
- 3 control settings: stability, similarity, intensity
- Allows stitching multiple clips together

### 3. **Fish Audio** (Budget Option)
- 15-second clip minimum
- Very accurate voice replication
- Lower cost than ElevenLabs

### 4. **Descript** (All-in-One)
- Voice cloning built into video editor
- Good for batch processing multiple videos
- Higher cost but includes editing tools

---

## 🛠 Technical Implementation for Dream Dairy

### Step 1: Extract Audio from Video (Browser-Side)

**Use ffmpeg.wasm** - runs entirely in the browser, no server needed!

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

**Code example:**
```javascript
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

async function extractAudio(videoFile) {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();
  
  // Write video to FFmpeg virtual filesystem
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
  
  // Extract audio as MP3
  await ffmpeg.exec(['-i', 'input.mp4', '-vn', '-acodec', 'mp3', 'output.mp3']);
  
  // Read extracted audio
  const audioData = await ffmpeg.readFile('output.mp3');
  return new Blob([audioData.buffer], { type: 'audio/mp3' });
}
```

**What this does:**
- Runs FFmpeg in the browser (no upload to server)
- Extracts audio track from video
- Converts to MP3 (required format for most voice cloning APIs)
- Returns audio blob ready for upload

**Alternative:** Use `ffmpeg.audio.wasm` (lighter, audio-focused version)

### Step 2: Send Audio to ElevenLabs API

```javascript
async function cloneVoice(audioBlob, voiceName) {
  const formData = new FormData();
  formData.append('name', voiceName);
  formData.append('files', audioBlob, 'voice_sample.mp3');
  formData.append('remove_background_noise', 'true'); // Optional: cleans up audio
  formData.append('description', 'Voice cloned from video');
  
  const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY // DO NOT expose client-side!
    },
    body: formData
  });
  
  const { voice_id } = await response.json();
  return voice_id; // Save this to use the voice later
}
```

**⚠️ Security Note:** Don't expose ElevenLabs API key in browser!
- Move this to a **Vercel Serverless Function** (like you should do with Gemini key)

### Step 3: Generate Speech with Cloned Voice

```javascript
async function speakWithClonedVoice(voiceId, text) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });
  
  const audioBlob = await response.blob();
  // Play or download the generated audio
  const audio = new Audio(URL.createObjectURL(audioBlob));
  audio.play();
}
```

---

## 📊 Quality Requirements for Voice Cloning

### Audio Quality Checklist:
✅ **Duration:** 1-3 minutes ideal (minimum 10 seconds)
✅ **Clarity:** Clear speech, no excessive background noise
✅ **Single speaker:** One voice per sample
✅ **Variety:** Mix of tones/emotions if possible
❌ **Avoid:** Music, overlapping voices, heavy echo

**The AI clones EVERYTHING:**
- Tone, pitch, accent
- Cadence, pauses
- Stutters, "ums" and "ahs"
- Breathing sounds
- Background characteristics

**Tip:** If video has background noise, use `remove_background_noise: true` in API

---

## 🔄 Recommended Workflow for Dream Dairy

### User Flow:
1. **User uploads video clip** (drag & drop)
2. **Extract audio** (ffmpeg.wasm in browser - instant)
3. **Show preview** ("We found 2:34 of audio")
4. **Send to serverless function** (secure API call)
5. **Clone voice** (ElevenLabs API - takes ~10 seconds)
6. **Save voice_id** to user's profile/local storage
7. **User can now generate speech** with that voice

### UI/UX Ideas:
- "Upload a video of [loved one's name]"
- Progress bar: "Extracting audio... Cloning voice... Done!"
- Test generation: "Try saying: 'Good morning, I love you'"
- Voice library: Manage multiple cloned voices

---

## 💰 Cost Estimate

### ElevenLabs Pricing Breakdown:
- **Voice cloning:** Free (just needs audio upload)
- **Text-to-speech generation:** ~$0.15 per 1,000 characters
- **Average dream diary entry:** ~500 characters = $0.075 per recording

**Monthly estimate (50 entries):**
- 50 dreams × 500 characters × $0.15/1000 = **$3.75/month**

**Free tier limits:**
- 10k characters/month = ~20 dream entries
- After that, needs paid plan

**Recommendation:** Start with free tier, upgrade to Starter ($5/month) when needed

---

## 🚀 Quick Start (Proof of Concept)

### 1. Install Dependencies
```bash
cd dream-dairy
npm install @ffmpeg/ffmpeg @ffmpeg/util @elevenlabs/elevenlabs-js
```

### 2. Create Serverless Function
`api/clone-voice.js` (Vercel serverless):
```javascript
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
  });

  try {
    const { audioFile, voiceName } = req.body;
    const result = await client.voices.ivc.create({
      name: voiceName,
      files: [audioFile],
      remove_background_noise: true
    });
    
    res.status(200).json({ voice_id: result.voice_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 3. Add to Environment Variables
```bash
vercel env add ELEVENLABS_API_KEY production
# Enter your ElevenLabs API key
```

---

## 🎯 Alternatives if Budget is Tight

### Open Source Options:
1. **Coqui TTS** (Self-hosted, free)
   - Requires GPU for training
   - More complex setup
   - Lower quality than ElevenLabs

2. **Tortoise TTS** (Free, local)
   - Very slow (5 minutes to generate 10 seconds)
   - High quality but not real-time

3. **XTTS v2** (Coqui)
   - Zero-shot voice cloning
   - Needs ~6 seconds of audio
   - Can run locally with GPU

**Verdict:** For a consumer app like dream-dairy, **ElevenLabs is worth the cost** for speed + quality.

---

## ⚡ Next Steps

### If you want to build this:

1. **Get ElevenLabs API key** (free tier to start)
2. **Test voice cloning manually** via their web UI first
3. **Add ffmpeg.wasm** to extract audio from video
4. **Create serverless function** for secure API calls
5. **Build UI** for video upload + voice management
6. **Test with real videos** and iterate

### Want me to:
- [ ] Set up the voice cloning implementation?
- [ ] Create a proof-of-concept demo?
- [ ] Write the full feature with UI?

---

## 📚 Resources

- **ElevenLabs Docs:** https://elevenlabs.io/docs
- **ffmpeg.wasm:** https://github.com/ffmpegwasm/ffmpeg.wasm
- **React + FFmpeg Tutorial:** https://blog.kumard3.com/blog/extracting-audio-from-video-browser-react-ffmpeg-wasm
- **ElevenLabs API Reference:** https://elevenlabs.io/docs/api-reference/voices/ivc/create

---

**Bottom Line:** Yes, you can absolutely add voice cloning from video to dream-dairy! The tech is mature, affordable, and ready to use. ElevenLabs + ffmpeg.wasm is your best bet. Let me know if you want me to start building it! 🚀
