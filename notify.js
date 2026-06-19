const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsApp(to, message) {
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_WHATSAPP,
    to: 'whatsapp:' + to
  });
}

module.exports = { sendWhatsApp: sendWhatsApp };