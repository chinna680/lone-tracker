require('dotenv').config();

async function sendWhatsapp(to, message) {
  const twilio = require('twilio');
  const clint = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_WHATSAPP,
    to: 'whatsapp:' + to
  });
}

module.exports = { sendWhatsApp: sendWhatsApp };
