require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;
const { getAssistantReply } = require('./assistant');

const app = express();

// Twilio sends x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('Voice Agent Server Running');
});

// MAIN TWILIO WEBHOOK
app.post('/twilio/voice', async (req, res) => {
  console.log('\n--- Twilio Webhook HIT ---');
  console.log('Body:', req.body);

  try {
    const twiml = new VoiceResponse();
    const speech = (req.body.SpeechResult || '').trim();

    // FIRST CALL — no speech yet
    if (!speech) {
      console.log('No speech detected yet. Sending greeting...');

      const gather = twiml.gather({
        input: 'speech',
        action: '/twilio/voice',
        speechTimeout: 'auto'
      });

      gather.say(
        'નમસ્તે. હું પેમેન્ટ અથવા સર્વિસ અપડેટ માટે ફોન કરી રહ્યો છું. તમારું નામ શું છે?'
      );

      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // AFTER USER SPEAKS
    console.log('User said:', speech);

    const aiReply = await getAssistantReply(speech);
    console.log('AI Reply:', aiReply);

    const gather = twiml.gather({
      input: 'speech',
      action: '/twilio/voice',
      speechTimeout: 'auto'
    });

    gather.say(aiReply);

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error in /twilio/voice:', error);

    const twiml = new VoiceResponse();
    twiml.say('માફ કરશો, ટેકનિકલ સમસ્યા છે. પછીથી ફરી પ્રયાસ કરીશું.');

    res.type('text/xml');
    return res.send(twiml.toString());
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✔ Server running on port ${PORT}`);
});
