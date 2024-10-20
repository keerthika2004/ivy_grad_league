const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const axios = require('axios');  // For making HTTP requests to PayPal API
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

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
  service: 'gmail',
  auth: {
    user: 'vkr.games.play@gmail.com',
    pass: 'pzka eoiu svzp pyho'  // Use environment variables for sensitive information
  }
});

// Route to verify PayPal payment
app.post('/verify-payment', async (req, res) => {
  const { orderID } = req.body;

  try {
    // Step 1: Get Access Token from PayPal
    const { data: { access_token } } = await axios({
      url: `${PAYPAL_API}/v1/oauth2/token`,
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      auth: {
        username: AXPfW8u2ZCez-beGvXbn6ThfM7sSQeoAxWwqZmoBPZZAWWlCUo7UZNtuWSsiSLz4Z2bEeIbmjsTI5bfX,
        password: AXPfW8u2ZCez-beGvXbn6ThfM7sSQeoAxWwqZmoBPZZAWWlCUo7UZNtuWSsiSLz4Z2bEeIbmjsTI5bfX
      },
      data: 'grant_type=client_credentials'
    });

    // Step 2: Use the Access Token to get order details
    const { data: orderDetails } = await axios({
      url: `${PAYPAL_API}/v2/checkout/orders/${orderID}`,
      method: 'get',
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    // Step 3: Check if the order status is COMPLETED
    if (orderDetails.status === 'COMPLETED') {
      res.status(200).send({ success: true, message: 'Payment verified!' });
    } else {
      res.status(400).send({ success: false, message: 'Payment not completed.' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).send({ success: false, message: 'Error verifying payment' });
  }
});

// Route to handle email submissions and send Google Meet link
app.post('/submit-email', async (req, res) => {
  const { email, appointmentDetails } = req.body;  // Assuming appointment details are sent with the email

  if (!email) {
    return res.status(400).send('Email is required');
  }

  // Respond immediately before sending the email
  res.status(200).send('Email is being sent');

  // Save email to CSV file
  try {
    await csvWriter.writeRecords([{ email }]);

    // Create a Google Meet link (for demo purposes; this will require actual API integration in a real app)
    const meetLink = 'https://meet.google.com/kti-dbpt-wyo'; // Replace with your logic to generate a link

    // Email options for sending PDF and Google Meet link
    const mailOptions = {
      from: 'vkr.games.play@gmail.com',
      to: email,
      subject: 'Your Free PDF Download and Meeting Confirmation',
      text: `Thank you for scheduling your meeting! Here is your Google Meet link: ${meetLink}`,
      attachments: [
        {
          filename: 'valuable_document.pdf',
          path: path.join(__dirname, 'valuable_document.pdf')  // Path to your PDF
        }
      ]
    };

    // Send email with PDF attachment and meeting link
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
});

// Serve frontend files (like index.html)
app.use(express.static('public'));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// const express = require('express');
// const bodyParser = require('body-parser');
// const nodemailer = require('nodemailer');
// const fs = require('fs');
// const { createObjectCsvWriter } = require('csv-writer');
// const path = require('path');

// const app = express();
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

// //CSV writer to store emails
// const csvWriter = createObjectCsvWriter({
//   path: 'emails.csv',
//   header: [{ id: 'email', title: 'Email' }],
//   append: true
// });

// //Nodemailer setup for sending emails
// const transporter = nodemailer.createTransport({
//   service: 'gmail',  // or any other email service like Outlook, Yahoo
//   auth: {
//     user: 'vkr.games.play@gmail.com',  // Replace with your email
//     pass: 'pzka eoiu svzp pyho'    // Replace with your email password or App password
//   }
// });

// //Route to handle email submissions
// app.post('/submit-email', async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).send('Email is required');
//   }

//   //Save email to CSV file
//   try {
//     await csvWriter.writeRecords([{ email }]);
//   } catch (error) {
//     return res.status(500).send('Error saving email to CSV');
//   }

//   // Email options for sending PDF
//   const mailOptions = {
//     from: 'vkr.games.play@gmail.com', 
//     to: email,
//     subject: 'Your Free PDF Download',
//     text: 'Thank you for subscribing! Here is your free PDF.',
//     attachments: [
//       {
//         filename: 'valuable_document.pdf',
//         path: path.join(__dirname, 'valuable_document.pdf') // Path to your PDF
//       }
//     ]
//   };

//   //Send email with PDF attachment
//   transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//       console.log('Error sending email:', error); // Detailed error message
//       return res.status(500).send('Error sending email: ' + error.message); // Send error message to client
//     }
//     console.log('Email sent:', info.response);
//     res.status(200).send('Email sent successfully');
//   });
  
// });

// // Serve frontend files (like index.html)
// app.use(express.static('public'));

// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });


