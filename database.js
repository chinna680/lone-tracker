
const mongoose = require('mongoose');

const borrowerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  whatsapp: String,
  loan_amount: Number,
  amount_paid: { type: Number, default: 0 },
  due_date: String,
  status: { type: String, default: 'pending' }
});

const Borrower = mongoose.model('Borrower', borrowerSchema);

function connectDB() {
  return mongoose.connect(process.env.MONGODB_URI);
}

module.exports = { Borrower, connectDB };
