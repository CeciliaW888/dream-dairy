/**
 * Vercel Serverless Function: Clone Voice using ElevenLabs API
 * 
 * This keeps the ElevenLabs API key secure on the server side.
 * 
 * Endpoint: /api/clone-voice
 * Method: POST
 * Body: FormData with 'name' and 'audioFile'
 */

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for multipart/form-data
  },
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for API key
  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  try {
    // Parse multipart form data
    const formData = await parseMultipartForm(req);
    const { name, audioFile } = formData;

    if (!name || !audioFile) {
      return res.status(400).json({ error: 'Missing required fields: name and audioFile' });
    }

    // Forward to ElevenLabs API  
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.set('name', name);
    
    // Create a Blob from the Buffer (Node.js 18+ has global Blob)
    const blob = new Blob([audioFile], { type: 'audio/webm' });
    elevenLabsFormData.set('files', blob, 'voice_sample.webm');
    
    elevenLabsFormData.set('remove_background_noise', 'true');
    elevenLabsFormData.set('description', `Voice cloned from Dream Dairy on ${new Date().toISOString()}`);

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: elevenLabsFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail?.message || 'Voice cloning failed');
    }

    const result = await response.json();

    res.status(200).json({
      success: true,
      voice_id: result.voice_id,
      requires_verification: result.requires_verification,
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
 * (In production, use a library like 'formidable' or 'busboy')
 */
async function parseMultipartForm(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // Extract boundary from content-type
  const contentType = req.headers['content-type'];
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch) {
    throw new Error('No boundary found in Content-Type');
  }
  const boundary = boundaryMatch[1];

  // Parse multipart data (simplified - production use proper library)
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
          // File field
          result[fieldName] = Buffer.from(content, 'binary');
        } else {
          // Text field
          result[fieldName] = content;
        }
      }
    }
  }

  return result;
}
