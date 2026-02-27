# Voice Cloning Setup Guide

## 🎯 What This Feature Does

The voice cloning feature allows users to:
1. **Upload a video** of someone they love
2. **Automatically extract audio** from the video (happens in browser)
3. **Clone the voice** using AI (ElevenLabs API)
4. **Use that voice** to narrate dream diary entries

**Example use case:** Record your mom reading a story, clone her voice, then have your dream diary narrated in her voice forever.

---

## 📋 Prerequisites

### 1. Get ElevenLabs API Key

1. Go to https://elevenlabs.io/
2. Sign up for a free account
3. Navigate to Profile → API Keys
4. Create a new API key
5. Copy the key (starts with `sk-...`)

**Free tier includes:**
- 10,000 characters/month (~20 dream entries)
- Voice cloning (unlimited)
- Basic voice quality

**Paid plans:**
- Starter ($5/mo): 30k characters
- Creator ($22/mo): 100k characters
- Pro ($99/mo): 500k characters

### 2. Add API Key to Vercel

Since this key must stay **secret**, add it as an environment variable:

```bash
# Add to production
vercel env add ELEVENLABS_API_KEY production

# Add to preview
vercel env add ELEVENLABS_API_KEY preview

# Paste your key when prompted
```

Or via Vercel dashboard:
1. Go to project settings
2. Environment Variables
3. Add `ELEVENLABS_API_KEY`
4. Mark as **Sensitive**
5. Apply to Production + Preview

### 3. Add to Local .env (Development)

```bash
# .env file (in root directory)
ELEVENLABS_API_KEY=sk-your-actual-key-here
```

**⚠️ IMPORTANT:** This file is in `.gitignore` - it won't be committed to git.

---

## 🛠 Technical Architecture

### Flow Diagram

```
User Uploads Video
       ↓
Extract Audio (ffmpeg.wasm in browser) ← 100% client-side
       ↓
Send audio to Vercel Serverless Function
       ↓
Forward to ElevenLabs API (secure, server-side)
       ↓
Receive voice_id
       ↓
Save to localStorage
       ↓
User can now generate speech with cloned voice
```

### Files Created

```
dream-dairy/
├── api/
│   └── clone-voice.js           ← Serverless function (keeps API key secure)
├── src/
│   ├── components/
│   │   ├── VoiceCloneModal.jsx  ← UI for voice cloning workflow
│   │   ├── TopNav.jsx           ← Added "VOICES" button
│   │   └── OverlayUI.jsx        ← Integrated modal
│   └── lib/
│       └── audioExtractor.js    ← FFmpeg.wasm utilities
├── .env                         ← Local secrets (not in git)
└── .env.example                 ← Template for required env vars
```

### Dependencies Added

```json
{
  "@ffmpeg/ffmpeg": "^0.12.x",  // Browser-based video → audio
  "@ffmpeg/util": "^0.12.x"     // Helper utilities
}
```

---

## 🚀 How to Use (User Perspective)

### 1. Access Voice Cloning

Click **"VOICES"** in the top navigation bar.

### 2. Upload Video

- Drag & drop or click to select a video file
- Any format works: MP4, MOV, AVI, etc.
- **Minimum:** 10 seconds of clear speech
- **Ideal:** 1-3 minutes for best quality

### 3. Wait for Processing

**Step 1: Extracting audio** (5-15 seconds)
- Happens in browser (nothing uploaded yet)
- Shows progress bar

**Step 2: Preview**
- Listen to extracted audio
- See duration
- Name the voice (e.g., "Mom", "Dad", "Best Friend")

**Step 3: Clone voice** (10-15 seconds)
- Audio sent to ElevenLabs API
- Voice model created
- Voice ID saved

### 4. Success!

- Voice is now in your library
- Can be used for any dream diary entry
- Stored permanently (as long as localStorage isn't cleared)

---

## 🔧 Testing the Feature

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Add API key to .env:**
   ```bash
   echo "ELEVENLABS_API_KEY=sk-your-key" >> .env
   ```

3. **Start dev server:**
   ```bash
   npm run dev
   ```

4. **Test the flow:**
   - Click "VOICES" button
   - Upload a test video
   - Watch the magic happen!

### Production Testing

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Verify env var is set:**
   ```bash
   vercel env ls
   ```

3. **Check serverless function:**
   - Visit: `https://your-app.vercel.app/api/clone-voice`
   - Should return: `{"error":"Method not allowed"}` (POST only)

4. **Test full flow:**
   - Upload video via UI
   - Check browser console for any errors
   - Verify voice_id is returned

---

## 🐛 Troubleshooting

### "Failed to extract audio from video"

**Possible causes:**
- Video file corrupted
- Unsupported codec
- Browser doesn't support ffmpeg.wasm

**Solutions:**
- Try a different video file
- Use a modern browser (Chrome, Firefox, Edge)
- Check browser console for specific errors

### "Voice cloning failed"

**Possible causes:**
- ElevenLabs API key not set
- API key invalid or expired
- Audio too short (< 10 seconds)
- Rate limit exceeded

**Solutions:**
- Verify `ELEVENLABS_API_KEY` in Vercel
- Check ElevenLabs dashboard for quota
- Try a longer video clip
- Check serverless function logs in Vercel

### "Upload button doesn't work"

**Possible causes:**
- JavaScript error in browser
- React component not mounted

**Solutions:**
- Check browser console for errors
- Refresh the page
- Clear cache and reload

### API calls failing in production

**Check:**
1. Environment variable is set:
   ```bash
   vercel env ls
   ```

2. Serverless function deployed:
   - Check Vercel dashboard → Functions tab
   - Should see `api/clone-voice.js`

3. Logs:
   - Vercel dashboard → Logs
   - Filter by `/api/clone-voice`

---

## 💾 Data Storage

### Where Voices Are Stored

**Client-side (localStorage):**
```javascript
{
  "clonedVoices": [
    {
      "id": "abc123...",        // ElevenLabs voice_id
      "name": "Mom",             // User-provided name
      "createdAt": "2026-02-26T..." // Timestamp
    }
  ]
}
```

**Server-side (ElevenLabs):**
- Voice model stored in your ElevenLabs account
- Accessible via voice_id
- Persists as long as you have active account

### Data Privacy

**Video/Audio Processing:**
- Video → audio extraction happens **in browser** (never uploaded)
- Only final audio (MP3) sent to server
- Audio sent to ElevenLabs for training
- Original video never leaves user's device

**API Key Security:**
- ElevenLabs key stored in Vercel (server-side only)
- **Never exposed to client** (browser)
- Requests proxied through serverless function

---

## 🔮 Future Enhancements

### Phase 1: Voice Library ✅
- [x] Upload video
- [x] Extract audio
- [x] Clone voice
- [x] Store voice_id

### Phase 2: Voice Selection (TODO)
- [ ] Show list of cloned voices
- [ ] Select voice for dream diary
- [ ] Preview voice before using
- [ ] Delete/rename voices

### Phase 3: Advanced Features (TODO)
- [ ] Multiple video clips → better voice quality
- [ ] Voice settings (stability, similarity, style)
- [ ] Export/import voice library
- [ ] Share voices across devices (cloud storage)

### Phase 4: Integration (TODO)
- [ ] Use cloned voices in Gemini AI responses
- [ ] Voice switcher in conversation panel
- [ ] Per-diary voice assignment
- [ ] Voice mixing (multiple voices in one entry)

---

## 📊 Cost Tracking

### Estimating Usage

**Voice Cloning:**
- Cost: **FREE** (no per-clone charge)
- Limit: Unlimited on all plans

**Text-to-Speech:**
- Cost: ~$0.15 per 1,000 characters
- Average dream entry: 500 characters = **$0.075**

**Monthly estimate (50 entries):**
```
50 dreams × 500 chars × $0.15/1000 = $3.75/month
```

**Free tier:**
```
10,000 chars/month ÷ 500 chars/entry = 20 entries/month
```

### Monitoring

Check usage at:
https://elevenlabs.io/usage

---

## 🎓 Resources

- **ElevenLabs Docs:** https://elevenlabs.io/docs
- **Voice Cloning API:** https://elevenlabs.io/docs/api-reference/voices/ivc/create
- **ffmpeg.wasm:** https://github.com/ffmpegwasm/ffmpeg.wasm
- **Research Doc:** `./VOICE_CLONING_RESEARCH.md`

---

## 🆘 Need Help?

If you run into issues:

1. **Check browser console** for client-side errors
2. **Check Vercel logs** for serverless function errors
3. **Verify env vars** are set correctly
4. **Test with a simple video** (short, clear audio)
5. **Review ElevenLabs quota** in dashboard

**Still stuck?** Create an issue with:
- Error message
- Browser/OS
- Steps to reproduce
- Screenshots if possible

---

## ✨ Demo Video

(TODO: Record a demo showing the full workflow)

**What it shows:**
1. Clicking "VOICES" button
2. Uploading a video
3. Audio extraction progress
4. Voice preview
5. Cloning process
6. Success confirmation
7. Voice appearing in library

---

**Built with ❤️ for Dream Dairy**
