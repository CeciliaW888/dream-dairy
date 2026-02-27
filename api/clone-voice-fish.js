/**
 * Vercel Serverless Function: Clone Voice using Fish Audio API
 * FREE voice cloning alternative to ElevenLabs
 * 
 * Endpoint: /api/clone-voice-fish
 * Method: POST
 * Body: FormData with 'name' and 'audioFile'
 */

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.FISH_AUDIO_API_KEY) {
    return res.status(500).json({ 
      error: 'Fish Audio API key not configured. Sign up at https://fish.audio and add FISH_AUDIO_API_KEY to environment variables.' 
    });
  }

  try {
    // Parse multipart form data
    const formData = await parseMultipartForm(req);
    const { name, audioFile } = formData;

    if (!name || !audioFile) {
      return res.status(400).json({ error: 'Missing required fields: name and audioFile' });
    }

    // Create Fish Audio voice model
    const fishFormData = new FormData();
    fishFormData.set('type', 'tts');
    fishFormData.set('title', name);
    fishFormData.set('train_mode', 'fast'); // Instant voice cloning
    fishFormData.set('visibility', 'private');
    fishFormData.set('enhance_audio_quality', 'true');
    
    // Convert Buffer to Blob
    const blob = new Blob([audioFile], { type: 'audio/webm' });
    fishFormData.set('voices', blob, 'voice_sample.webm');

    const response = await fetch('https://api.fish.audio/model', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
      },
      body: fishFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fish Audio error:', errorText);
      throw new Error(`Voice cloning failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    res.status(200).json({
      success: true,
      voice_id: result._id,
      state: result.state, // 'created', 'training', 'trained', 'failed'
      title: result.title,
    });

  } catch (error) {
    console.error('Voice cloning error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to clone voice',
    });
  }
}

/**
 * Simple multipart/form-data parser
 */
async function parseMultipartForm(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const contentType = req.headers['content-type'];
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch) {
    throw new Error('No boundary found in Content-Type');
  }
  const boundary = boundaryMatch[1];

  const parts = buffer.toString('binary').split(`--${boundary}`);
  const result = {};

  for (const part of parts) {
    if (part.includes('Content-Disposition')) {
      const nameMatch = part.match(/name="([^"]+)"/);
      const filenameMatch = part.match(/filename="([^"]+)"/);
      
      if (nameMatch) {
        const fieldName = nameMatch[1];
        const contentStart = part.indexOf('\r\n\r\n') + 4;
        const contentEnd = part.lastIndexOf('\r\n');
        const content = part.substring(contentStart, contentEnd);

        if (filenameMatch) {
          result[fieldName] = Buffer.from(content, 'binary');
        } else {
          result[fieldName] = content;
        }
      }
    }
  }

  return result;
}
