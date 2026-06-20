const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./database');
const notify = require('./notify');
require('dotenv').config();

const sendWhatsApp = notify.sendWhatsApp;

const app = express();
app.use(cors({
  origin: 'x'
}));
app.use(express.json());

app.get('/borrowers', function (req, res) {
  const borrowers = db.prepare('SELECT * FROM borrowers').all();
  res.json(borrowers);
});

app.post('/borrowers', function (req, res) {
  const name = req.body.name;
  const phone = req.body.phone;
  const whatsapp = req.body.whatsapp;
  const loan_amount = req.body.loan_amount;
  const due_date = req.body.due_date;

  const result = db.prepare(
    'INSERT INTO borrowers (name, phone, whatsapp, loan_amount, amount_paid, due_date) VALUES (?, ?, ?, ?, 0, ?)'
  ).run(name, phone, whatsapp, loan_amount, due_date);

  res.json({ id: result.lastInsertRowid, message: 'Borrower added!' });
});

app.post('/borrowers/:id/payment', function (req, res) {
  const id = req.params.id;
  const payAmount = parseFloat(req.body.amount);

  const b = db.prepare('SELECT * FROM borrowers WHERE id = ?').get(id);
  if (!b) {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  let newPaid = b.amount_paid + payAmount;
  if (newPaid > b.loan_amount) {
    newPaid = b.loan_amount;
  }

  let newStatus = b.status;
  if (newPaid >= b.loan_amount) {
    newStatus = 'paid';
  }

  db.prepare('UPDATE borrowers SET amount_paid = ?, status = ? WHERE id = ?')
    .run(newPaid, newStatus, id);

  res.json({ message: 'Payment recorded!', amount_paid: newPaid });
});

app.put('/borrowers/:id/paid', function (req, res) {
  const b = db.prepare('SELECT * FROM borrowers WHERE id = ?').get(req.params.id);
  if (!b) {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  db.prepare('UPDATE borrowers SET status = ?, amount_paid = ? WHERE id = ?')
    .run('paid', b.loan_amount, req.params.id);
  res.json({ message: 'Marked as paid!' });
});

app.delete('/borrowers/:id', function (req, res) {
  db.prepare('DELETE FROM borrowers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted!' });
});

app.post('/borrowers/:id/remind', function (req, res) {
  const b = db.prepare('SELECT * FROM borrowers WHERE id = ?').get(req.params.id);
  if (!b) {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  const remaining = b.loan_amount - b.amount_paid;
  const msg = 'Hello ' + b.name + ', you have Rs.' + remaining + ' remaining out of Rs.' + b.loan_amount + ' (due ' + b.due_date + '). Please pay soon.';

  sendWhatsApp(b.whatsapp, msg)
    .then(function () {
      res.json({ message: 'Reminder sent!' });
    })
    .catch(function (err) {
      console.log(err);
      res.status(500).json({ message: 'Failed to send reminder' });
    });
});

app.post('/borrowers/remind-all', function (req, res) {
  const today = new Date().toISOString().split('T')[0];
  const overdue = db.prepare(
    "SELECT * FROM borrowers WHERE due_date < ? AND status = 'pending'"
  ).all(today);

  const promises = overdue.map(function (b) {
    const remaining = b.loan_amount - b.amount_paid;
    const msg = 'REMINDER: Hello ' + b.name + ', you have Rs.' + remaining + ' remaining (was due ' + b.due_date + '). Please pay now!';
    return sendWhatsApp(b.whatsapp, msg);
  });

  Promise.all(promises)
    .then(function () {
      res.json({ message: 'Sent reminders to ' + overdue.length + ' people', count: overdue.length });
    })
    .catch(function (err) {
      console.log(err);
      res.status(500).json({ message: 'Some reminders failed to send' });
    });
});

cron.schedule('0 9 * * *', function () {
  const today = new Date().toISOString().split('T')[0];
  const overdue = db.prepare(
    "SELECT * FROM borrowers WHERE due_date < ? AND status = 'pending'"
  ).all(today);

  overdue.forEach(function (b) {
    const remaining = b.loan_amount - b.amount_paid;
    const msg = 'REMINDER: Hello ' + b.name + ', you have Rs.' + remaining + ' remaining (was due ' + b.due_date + '). Please pay now!';
    sendWhatsApp(b.whatsapp, msg);
  });

  console.log('Sent reminders to ' + overdue.length + ' people');
});

const PORT = process.env.PORT || 8080;
app.listen(process.env.PORT, function () {
  console.log('Server running on http://localhost:' + process.env.PORT);
});
