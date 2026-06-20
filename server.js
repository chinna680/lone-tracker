const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { Borrower, connectDB } = require('./database');
const notify = require('./notify');
require('dotenv').config();

const sendWhatsApp = notify.sendWhatsApp;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

connectDB().then(function () {
  console.log('Connected to MongoDB');
}).catch(function (err) {
  console.log('MongoDB connection error:', err);
});

app.get('/borrowers', function (req, res) {
  Borrower.find().then(function (borrowers) {
    res.json(borrowers);
  }).catch(function (err) {
    res.status(500).json({ message: 'Error fetching borrowers' });
  });
});

app.post('/borrowers', function (req, res) {
  const newBorrower = new Borrower({
    name: req.body.name,
    phone: req.body.phone,
    whatsapp: req.body.whatsapp,
    loan_amount: parseFloat(req.body.loan_amount),
    amount_paid: 0,
    due_date: req.body.due_date,
    status: 'pending'
  });
  newBorrower.save().then(function (saved) {
    res.json({ id: saved._id, message: 'Borrower added!' });
  }).catch(function (err) {
    res.status(500).json({ message: 'Error adding borrower' });
  });
});

app.post('/borrowers/:id/payment', function (req, res) {
  Borrower.findById(req.params.id).then(function (b) {
    if (!b) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    let newPaid = b.amount_paid + parseFloat(req.body.amount);
    if (newPaid > b.loan_amount) newPaid = b.loan_amount;
    b.amount_paid = newPaid;
    if (newPaid >= b.loan_amount) b.status = 'paid';
    return b.save().then(function () {
      res.json({ message: 'Payment recorded!', amount_paid: newPaid });
    });
  }).catch(function (err) {
    res.status(500).json({ message: 'Error recording payment' });
  });
});

app.put('/borrowers/:id/paid', function (req, res) {
  Borrower.findById(req.params.id).then(function (b) {
    if (!b) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    b.status = 'paid';
    b.amount_paid = b.loan_amount;
    return b.save().then(function () {
      res.json({ message: 'Marked as paid!' });
    });
  }).catch(function (err) {
    res.status(500).json({ message: 'Error updating borrower' });
  });
});

app.delete('/borrowers/:id', function (req, res) {
  Borrower.findByIdAndDelete(req.params.id).then(function () {
    res.json({ message: 'Deleted!' });
  }).catch(function (err) {
    res.status(500).json({ message: 'Error deleting borrower' });
  });
});

app.post('/borrowers/:id/remind', function (req, res) {
  Borrower.findById(req.params.id).then(function (b) {
    if (!b) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const remaining = b.loan_amount - b.amount_paid;
    const msg = 'Hello ' + b.name + ', you have Rs.' + remaining + ' remaining out of Rs.' + b.loan_amount + ' (due ' + b.due_date + '). Please pay soon.';
    return sendWhatsApp(b.whatsapp, msg).then(function () {
      res.json({ message: 'Reminder sent!' });
    });
  }).catch(function (err) {
    console.log(err);
    res.status(500).json({ message: 'Failed to send reminder' });
  });
});

app.post('/borrowers/remind-all', function (req, res) {
  const today = new Date().toISOString().split('T')[0];
  Borrower.find({ due_date: { $lt: today }, status: 'pending' }).then(function (overdue) {
    const promises = overdue.map(function (b) {
      const remaining = b.loan_amount - b.amount_paid;
      const msg = 'REMINDER: Hello ' + b.name + ', you have Rs.' + remaining + ' remaining (was due ' + b.due_date + '). Please pay now!';
      return sendWhatsApp(b.whatsapp, msg);
    });
    return Promise.all(promises).then(function () {
      res.json({ message: 'Sent reminders to ' + overdue.length + ' people' });
    });
  }).catch(function (err) {
    console.log(err);
    res.status(500).json({ message: 'Some reminders failed' });
  });
});

cron.schedule('0 9 * * *', function () {
  const today = new Date().toISOString().split('T')[0];
  Borrower.find({ due_date: { $lt: today }, status: 'pending' }).then(function (overdue) {
    overdue.forEach(function (b) {
      const remaining = b.loan_amount - b.amount_paid;
      const msg = 'REMINDER: Hello ' + b.name + ', you have Rs.' + remaining + ' remaining (was due ' + b.due_date + '). Please pay now!';
      sendWhatsApp(b.whatsapp, msg);
    });
    console.log('Sent reminders to ' + overdue.length + ' people');
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log('Server running on http://localhost:' + PORT);
});
