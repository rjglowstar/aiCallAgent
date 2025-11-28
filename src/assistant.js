const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAssistantReply(userText) {
  try {
    console.log('OpenAI Input:', userText);

    const r = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 120,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `
                    You are an AI Gujarati calling agent.
                    Speak only in Gujarati.
                    Use short, clear, natural Gujarati sentences.
                    Avoid English unless absolutely required.
                    Talk slowly and politely like a real Indian phone agent.
                  `
        },
        { role: 'user', content: userText }
      ]
    });

    const reply = r?.choices?.[0]?.message?.content?.trim();
    console.log('OpenAI Output:', reply);

    return reply || 'માફ કરશો, થોડો સમય લાગી રહ્યો છે.';
  } catch (e) {
    console.error('OpenAI Error:', e);
    return 'માફ કરશો, થોડો સમય લાગી રહ્યો છે.';
  }
}

module.exports = { getAssistantReply };
