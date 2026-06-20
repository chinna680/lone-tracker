require('dotenv').config();

function sendWhatsApp(to, message) {
  const twilio = require('twilio');
  const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_WHATSAPP,
    to: 'whatsapp:' + to
  });
}

module.exports = { sendWhatsApp: sendWhatsApp };
