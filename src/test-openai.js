require('dotenv').config();
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function run() {
    try {
        const r = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "user", content: "Gujarati boline test karo" }
            ]
        });

        console.log("RESULT:", r.choices[0].message.content);
    } catch (err) {
        console.error("ERROR:", err);
    }
}

run();
