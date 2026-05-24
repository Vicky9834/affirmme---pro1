// api/generate.js
// Vercel Serverless Function — Anthropic API Proxy
// This keeps your API key hidden from users

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the user's prompt from the request
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // Hidden in Vercel environment
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Cheapest model — saves credits
        max_tokens: 500,
        system: `You are a faith-forward affirmation generator for AffirmMe Pro by Beyond Limits. 
Generate a single powerful, Scripture-rooted personal affirmation based on the user's situation.

Format your response EXACTLY like this:
AFFIRMATION: [Write a bold, faith-filled first-person declaration of 2-4 sentences]
SCRIPTURE: [Quote a relevant Bible verse]
REFERENCE: [Book Chapter:Verse Translation]

Keep it personal, powerful, and rooted in God's Word. Use NIV, NKJV, ESV, NLT or NASB translations only.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    // Extract the text response
    const text = data.content[0]?.text || '';

    // Parse the structured response
    const affirmationMatch = text.match(/AFFIRMATION:\s*(.+?)(?=SCRIPTURE:|$)/s);
    const scriptureMatch = text.match(/SCRIPTURE:\s*(.+?)(?=REFERENCE:|$)/s);
    const referenceMatch = text.match(/REFERENCE:\s*(.+?)$/s);

    return res.status(200).json({
      affirmation: affirmationMatch ? affirmationMatch[1].trim() : text,
      scripture: scriptureMatch ? scriptureMatch[1].trim() : '',
      reference: referenceMatch ? referenceMatch[1].trim() : ''
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
