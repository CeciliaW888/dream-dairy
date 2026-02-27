# Voice Cloning Production Best Practices - Research

**Date:** 2026-02-28  
**Context:** User feedback - "it's taking tooo long. Research if there are better options for production app"

## Current Approach (Client-Side FFmpeg.wasm)

**What we're doing:**
- Downloading 10-20MB FFmpeg.wasm to browser (one-time)
- Extracting audio from video in browser
- Uploading extracted audio to serverless function
- Serverless function sends to ElevenLabs API

**Problems:**
- ❌ 10-20MB download on first use (slow on bad connections)
- ❌ WASM execution slower than native
- ❌ Large videos (>100MB) crash browser
- ❌ User can't navigate away (loses progress)
- ❌ Doesn't work on mobile (limited memory)
- ❌ "Taking too long" - poor UX

## What Production Apps Actually Do

### ElevenLabs (Official Voice Cloning Platform)

**Their approach:**
- ✅ **Accept AUDIO files only** (no video extraction!)
- ✅ Users upload: MP3, WAV, M4A, etc.
- ✅ Or record directly in browser
- ❌ **They don't extract from video** at all

**Key insight:** They push the "extract audio first" burden to users OR other tools.

### Loom (Video Platform)

**Their approach:**
- ✅ Upload **raw video** to server
- ✅ Process server-side (transcoding, extraction, etc.)
- ✅ **User can navigate away** - processing continues
- ✅ Show "Processing..." state
- ✅ Email/notify when done

**Quote from docs:**
> "Your videos will keep uploading even if you click out of the upload modal—they'll only stop if you cancel the upload. Videos that are large in resolution, size, or duration will take longer to process and may remain in a processing state after uploading."

### Descript, Riverside.fm, etc.

**Similar pattern:**
- ✅ Upload raw media
- ✅ Server-side processing
- ✅ Background jobs
- ✅ Webhooks/notifications when done

## Production Pattern: Server-Side Processing

### How it works:

1. **Client uploads raw video**
   - Direct to cloud storage (S3, Cloudflare R2, etc.)
   - Shows upload progress (MB transferred)
   - Can use resumable uploads (Tus protocol)

2. **Server processes asynchronously**
   - Background job (queue: Bull, BullMQ, etc.)
   - Native FFmpeg on server (10-100x faster than WASM)
   - Can handle ANY size video
   - Won't crash user's browser

3. **User experience**
   - Upload progress: "Uploading... 45MB / 120MB"
   - Then: "Processing... We'll email you when ready"
   - User can close tab/browser
   - Check status later or get notified

4. **Send to ElevenLabs when ready**
   - Extracted audio is clean
   - Server sends to API
   - Updates voice status

### Architecture

```
Client (Browser)
  ↓ Upload raw video
Cloud Storage (S3/R2/Cloudinary)
  ↓ Trigger webhook/event
Background Job Queue
  ↓ Process with native FFmpeg
  ↓ Extract audio
ElevenLabs API
  ↓ Clone voice
Database
  ↓ Update status
  ↓ Notify user (email/webhook)
Client (sees result)
```

## Recommendation for Dream Dairy

### Option 1: Keep Current Approach (Client-Side)

**When it works:**
- Small videos (<50MB)
- Short duration (<2 minutes)
- Good internet connection
- Desktop browsers only

**How to improve:**
1. ✅ Add file size limit (reject >50MB)
2. ✅ Add video length check (reject >3 minutes)
3. ✅ Better progress messages
4. ✅ Fallback: "Video too large? Try uploading audio instead"

**Cost:** Free (no server processing)

### Option 2: Server-Side Processing (Production Grade)

**How to implement:**

1. **Add upload endpoint:**
   ```javascript
   // /api/upload-video
   - Accept video file
   - Upload to Cloudflare R2 / AWS S3
   - Return upload ID
   - Queue background job
   ```

2. **Background job:**
   ```javascript
   // Worker (Vercel cron, AWS Lambda, etc.)
   - Download video from storage
   - Extract audio with native FFmpeg
   - Upload to ElevenLabs
   - Update database with voice_id
   - Delete temp files
   ```

3. **Status endpoint:**
   ```javascript
   // /api/voice-status/:uploadId
   - Check job status
   - Return: "uploading" | "processing" | "done" | "error"
   ```

4. **Client polls:**
   ```javascript
   // Every 5 seconds
   - Check status
   - Show: "Processing... (30 seconds so far)"
   - When done: Show success
   ```

**Services needed:**
- Storage: Cloudflare R2 ($0.015/GB) or AWS S3
- Queue: Vercel cron (free tier) or AWS SQS
- Worker: Vercel serverless functions (free tier) or AWS Lambda

**Monthly cost estimate:**
- 100 videos/month @ 50MB each = 5GB = $0.08 storage
- Processing: Free (Vercel tier) or ~$1 (AWS Lambda)
- **Total: ~$1-5/month**

### Option 3: Hybrid (Best UX)

**Smart routing:**

```javascript
if (videoSize < 30MB && videoDuration < 2min) {
  // Client-side (fast, free)
  extractWithFFmpegWASM()
} else {
  // Server-side (reliable)
  uploadToServerForProcessing()
}
```

**Benefits:**
- Fast for small files
- Reliable for large files
- Best of both worlds

## What to Do NOW (Immediate Fix)

**For current broken state:**

1. **Add file validation BEFORE extraction:**
   ```javascript
   if (videoSize > 50MB) {
     setError('Video too large (>50MB). Please upload audio instead (MP3, WAV, etc.)')
     return;
   }
   ```

2. **Better loading UX:**
   ```javascript
   - Show estimated time: "Processing... about 30 seconds left"
   - Show file size: "Extracting audio from 45MB video..."
   - Add cancel button
   ```

3. **Recommend audio upload:**
   ```
   💡 Tip: For faster processing, extract audio first:
   - Use online tool: cloudconvert.com/mp4-to-mp3
   - Or macOS: Right-click video → "Encode Selected Video Files"
   - Then upload audio here (instant!)
   ```

4. **Add timeout:**
   ```javascript
   setTimeout(() => {
     if (progress < 100) {
       setError('Processing taking too long. Try a smaller file or audio instead.')
     }
   }, 60000); // 60 seconds
   ```

## Production Examples

### Replicate.com (AI API Platform)
- Upload video → S3
- Process server-side
- Webhook when done
- Users LOVE it

### RunwayML (AI Video Tools)
- Upload large files
- Background processing
- Email notification
- Can close browser

### Descript (Video Editor)
- Multi-GB uploads
- Server-side transcription
- Works on any device
- No browser crashes

## Bottom Line

**Current approach is NOT production-ready for videos >30MB or >2 minutes.**

**For MVP/Demo:** Add file size limits + better UX messages.

**For Production:** Move to server-side processing (standard pattern).

**Cost:** ~$1-5/month for 100 videos (totally worth it for good UX).

---

**Next Steps:**
1. Immediate: Add file limits + better messages (30 min)
2. Short-term: Implement server-side option (4-6 hours)
3. Long-term: Hybrid approach (best UX)
