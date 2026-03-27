const fetch = require('node-fetch');

const PROF_SYS = `Eres un profesor de idiomas con 20 años de experiencia enseñando a hispanohablantes. Combinas lingüística comunicativa, fonética práctica, gramática funcional y contexto cultural. Eres preciso, afectuoso, motivador. Das correcciones claras con ejemplos reales. Siempre respondes en español. Formato: JSON cuando se pide, texto cuando no.`;

exports.handler = async (event) => {
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const key = process.env.GEMINI_KEY;
  if (!key) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key configured' }) };
  }

  let msg, sys, max;
  try {
    const body = JSON.parse(event.body || '{}');
    msg = body.msg;
    sys = body.sys || '';
    max = body.max || 800;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!msg) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No message provided' }) };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: msg }] }],
        systemInstruction: { parts: [{ text: PROF_SYS + (sys ? '\n\n' + sys : '') }] },
        generationConfig: { maxOutputTokens: max, temperature: 0.7 }
      })
    });

    if (!resp.ok) {
      const err = await resp.json();
      console.error('Gemini error:', err);
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: err?.error?.message || 'Gemini error' }) };
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };

  } catch (e) {
    console.error('Function error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
