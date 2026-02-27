# Fish Audio Setup (FREE Voice Cloning!)

Dream Dairy now uses **Fish Audio** for voice cloning - it's FREE and works great!

## Setup Steps

### 1. Create Fish Audio Account

1. Go to [fish.audio/auth/signup](https://fish.audio/auth/signup)
2. Sign up for a free account
3. Verify your email

### 2. Get Your API Key

1. Log in to [fish.audio/app/api-keys](https://fish.audio/app/api-keys)
2. Click "Create New Key"
3. Give it a name (e.g., "Dream Diary")
4. Copy your API key

### 3. Configure Environment Variable

**Local Development:**

Edit `.env.local`:
```bash
FISH_AUDIO_API_KEY=your_key_here
```

**Vercel Production:**

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   - Name: `FISH_AUDIO_API_KEY`
   - Value: `your_key_here`
4. Click "Save"
5. Redeploy your project

### 4. Test It Out!

1. Start local dev: `vercel dev`
2. Open http://localhost:5175
3. Click "Clone Voice" button
4. Upload a video with at least 10 seconds of speech
5. Watch the magic happen! ✨

## Features

- ✅ **100% FREE** voice cloning
- ✅ Instant voice model creation (`train_mode: fast`)
- ✅ 10-30 seconds of audio needed
- ✅ Automatic audio enhancement
- ✅ Private voices (not shared publicly)
- ✅ Works with extracted video audio

## API Details

- **Endpoint:** `POST https://api.fish.audio/model`
- **Format:** `multipart/form-data`
- **Response:** Voice model ID (instantly available)
- **Documentation:** [docs.fish.audio](https://docs.fish.audio)

## Why Fish Audio?

- ElevenLabs requires $11/month for voice cloning
- Fish Audio is FREE with instant cloning
- High quality voice synthesis
- Simple API, easy integration

## Troubleshooting

**401 Unauthorized:**
- Check your API key is correct
- Make sure it's added to environment variables
- Restart `vercel dev` after changing `.env.local`

**Voice quality issues:**
- Use longer audio samples (30+ seconds ideal)
- Ensure clear speech with minimal background noise
- Enable `enhance_audio_quality` (already set by default)

---

**Ready to clone some voices!** 🎙️✨
