const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const schedule = require('node-schedule');  // For scheduling reminders

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// PayPal credentials (sandbox or live environment)
const PAYPAL_CLIENT_ID = 'AXPfW8u2ZCez-beGvXbn6ThfM7sSQeoAxWwqZmoBPZZAWWlCUo7UZNtuWSsiSLz4Z2bEeIbmjsTI5bfX';
const PAYPAL_CLIENT_SECRET = 'AXPfW8u2ZCez-beGvXbn6ThfM7sSQeoAxWwqZmoBPZZAWWlCUo7UZNtuWSsiSLz4Z2bEeIbmjsTI5bfX';
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Use live URL in production

// CSV writer to store emails
const csvWriter = createObjectCsvWriter({
  path: 'emails.csv',
  header: [{ id: 'email', title: 'Email' }],
  append: true
});

// Nodemailer setup for sending emails
const transporter = nodemailer.createTransport({
  host: "smtp.titan.email",
  port: 465,
  secure: true,
    auth: {
      user: process.env.HOSTINGER_EMAIL,
      pass: process.env.HOSTINGER_PASSWORD
    }
  });
  

// Verify SMTP connection
transporter.verify(function(error, success) {
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});


// Appointment data (in-memory or replace with DB)
let appointments = [];
const APPOINTMENTS_FILE = path.join(__dirname, 'appointments.json');
if (fs.existsSync(APPOINTMENTS_FILE)) {
  appointments = JSON.parse(fs.readFileSync(APPOINTMENTS_FILE, 'utf8'));
}

// Limit the number of appointments per day
const MAX_APPOINTMENTS_PER_DAY = 5;
const WORKING_HOURS_START = 9;
const WORKING_HOURS_END = 17;

// Check if a time slot is available
const isTimeSlotAvailable = (dateTime) => {
  return !appointments.some(app => app.dateTime === dateTime);
};

// Limit the number of meetings per day
const isMaxAppointmentsPerDayReached = (date) => {
  const appointmentsOnDate = appointments.filter(app => new Date(app.dateTime).toDateString() === new Date(date).toDateString());
  return appointmentsOnDate.length >= MAX_APPOINTMENTS_PER_DAY;
};

// Route to verify PayPal payment and send confirmation email with Google Meet link
app.post('/verify-payment', async (req, res) => {
  const { orderID, email, name, dateTime } = req.body;  // Include email, name, and dateTime for the booking details in the request

  try {
    const { data: { access_token } } = await axios({
      url: `${PAYPAL_API}/v1/oauth2/token`,
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      auth: {
        username: PAYPAL_CLIENT_ID,
        password: PAYPAL_CLIENT_SECRET
      },
      data: 'grant_type=client_credentials'
    });

    const { data: orderDetails } = await axios({
      url: `${PAYPAL_API}/v2/checkout/orders/${orderID}`,
      method: 'get',
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    if (orderDetails.status === 'COMPLETED') {
      // Send confirmation email with Google Meet link
      const meetLink = 'https://meet.google.com/kti-dbpt-wyo';  // Replace with your dynamic Google Meet link logic if available
      const mailOptions = {
        from: 'hello@ivygradcoaching.com',
        to: email,
        subject: 'Your Appointment Confirmation',
        text: `Dear ${name},\n\nYour appointment on ${dateTime} has been confirmed! Please join using this Google Meet link: ${meetLink}\n\nThank you!`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Error sending confirmation email:', error);
        } else {
          console.log('Confirmation email sent:', info.response);
        }
      });

      res.status(200).send({ success: true, message: 'Payment verified and confirmation email sent!' });
    } else {
      res.status(400).send({ success: false, message: 'Payment not completed.' });
    }
  } catch (error) {
    console.error('Error verifying payment or sending confirmation email:', error);
    res.status(500).send({ success: false, message: 'Error verifying payment' });
  }
});


// Route to book an appointment
app.post('/book-appointment', (req, res) => {
  const { name, email, address, notes, dateTime } = req.body;

  const appointmentTime = new Date(dateTime).getHours();
  if (appointmentTime < WORKING_HOURS_START || appointmentTime > WORKING_HOURS_END) {
    return res.status(400).send('Please choose a time between 9 AM and 5 PM.');
  }

  if (!isTimeSlotAvailable(dateTime)) {
    return res.status(400).send('This time slot is already booked. Please choose another.');
  }

  if (isMaxAppointmentsPerDayReached(dateTime)) {
    return res.status(400).send('Max appointments for this day reached. Please choose another date.');
  }

  appointments.push({ name, email, address, notes, dateTime });
  fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify(appointments, null, 2));

  const reminderDate = new Date(new Date(dateTime).getTime() - (24 * 60 * 60 * 1000));
  schedule.scheduleJob(reminderDate, function() {
    transporter.sendMail({
      from: 'hello@ivygradcoaching.com',
      to: email,
      subject: 'Appointment Reminder',
      text: 'Dear ${name}, this is a reminder for your upcoming appointment on ${dateTime}.'
    }, (error, info) => {
      if (error) {
        console.log('Error sending reminder email:', error);
      } else {
        console.log('Reminder email sent:', info.response);
      }
    });
  });

  res.status(200).send('Appointment booked successfully!');
});

// Route to handle email submissions and send pdf
app.post('/submit-email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send('Email is required');
  }

  try {
    await csvWriter.writeRecords([{ email }]);
    const meetLink = 'https://meet.google.com/kti-dbpt-wyo';

    // const mailOptions = {
    //   from: 'hello@ivygradcoaching.com',
    //   to: email,
    //   subject: 'Your Meeting Confirmation',
    //   text: 'Thank you for scheduling your meeting! Here is your Google Meet link: ${meetLink}'
    // };
    const mailOptions = {
          from: 'hello@ivygradcoaching.com', 
          to: email,
          subject: 'Your Free PDF Download',
          text: 'Thank you for subscribing! Here is your free PDF.',
          attachments: [
            {
              filename: 'valuable_document.pdf',
              path: path.join(__dirname, 'valuable_document.pdf') // Path to your PDF
            }
          ]
        };
      

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  } catch (error) {
    console.error('Error writing to CSV or sending email:', error);
  }

  res.status(200).send('Email sent with meeting link.');
});

// Serve frontend files (like index.html)
app.use(express.static('public'));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

