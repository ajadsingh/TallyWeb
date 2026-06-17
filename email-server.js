const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const port = 3001;

// ── Security: Only allow requests from the local app (localhost) ──────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'],
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type'],
}));

// ── Security: Rate limiting — max 10 emails per 15 minutes per IP ────────
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many email requests. Please wait 15 minutes.' },
});

app.use(express.json({ limit: '1mb' }));

// ── Security: Sanitize user input before use in HTML ─────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Security: Multer — PDF only, max 10 MB ───────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Email configuration - Replace with your email credentials
const EMAIL_CONFIG = {
  service: 'gmail', // You can change this to your email provider
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com', // Replace with your email
    pass: process.env.EMAIL_PASS || 'your-app-password'    // Replace with your app password
  }
};

// Create transporter
const transporter = nodemailer.createTransporter({
  service: EMAIL_CONFIG.service,
  auth: EMAIL_CONFIG.auth
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Email sending endpoint — rate limited
app.post('/api/send-email', emailLimiter, upload.single('pdf'), async (req, res) => {
  try {
    const { 
      recipientEmail, 
      invoiceNumber, 
      customerName, 
      amount, 
      date,
      gstDetails,
      items,
      companyName 
    } = req.body;

    // ── Validate required fields ─────────────────────────────────────────
    if (!recipientEmail || !invoiceNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient email and invoice number are required' 
      });
    }

    // ── Validate email format ────────────────────────────────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid recipient email address' });
    }

    // ── Sanitize all inputs before use in HTML ───────────────────────────
    const safeInvoiceNumber = escapeHtml(String(invoiceNumber));
    const safeCustomerName  = escapeHtml(String(customerName  || ''));
    const safeAmount        = escapeHtml(String(amount        || ''));
    const safeDate          = escapeHtml(String(date          || ''));
    const safeCompanyName   = escapeHtml(String(companyName   || 'Your Company'));

    // ── Safe JSON parse for nested objects ──────────────────────────────
    let parsedGstDetails = null;
    let parsedItems = [];
    try {
      parsedGstDetails = typeof gstDetails === 'string' ? JSON.parse(gstDetails) : (gstDetails || null);
    } catch { parsedGstDetails = null; }
    try {
      parsedItems = typeof items === 'string' ? JSON.parse(items) : (items || []);
      if (!Array.isArray(parsedItems)) parsedItems = [];
    } catch { parsedItems = []; }

    // Create email content — use sanitized values throughout
    const subject = `Invoice ${safeInvoiceNumber} - ₹${safeAmount}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">📧 Invoice Details</h1>
          <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 15px; border-radius: 8px;">
            <h2 style="margin: 0;">Invoice #${safeInvoiceNumber}</h2>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-top: 0;">📋 Invoice Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px 0; color: #111827;">${safeInvoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Date:</strong></td>
              <td style="padding: 8px 0; color: #111827;">${safeDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Customer:</strong></td>
              <td style="padding: 8px 0; color: #111827;">${safeCustomerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Total Amount:</strong></td>
              <td style="padding: 8px 0; color: #059669; font-weight: bold; font-size: 18px;">₹${safeAmount}</td>
            </tr>
          </table>
        </div>

        ${parsedGstDetails ? `
        <div style="background: #fef7e7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">🧾 GST Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${parsedGstDetails.cgst > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">CGST (${escapeHtml(String(parsedGstDetails.cgstRate))}%):</td>
              <td style="padding: 5px 0; color: #111827; text-align: right;">₹${Number(parsedGstDetails.cgst).toFixed(2)}</td>
            </tr>` : ''}
            ${parsedGstDetails.sgst > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">SGST (${escapeHtml(String(parsedGstDetails.sgstRate))}%):</td>
              <td style="padding: 5px 0; color: #111827; text-align: right;">₹${Number(parsedGstDetails.sgst).toFixed(2)}</td>
            </tr>` : ''}
            ${parsedGstDetails.igst > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">IGST (${escapeHtml(String(parsedGstDetails.igstRate))}%):</td>
              <td style="padding: 5px 0; color: #111827; text-align: right;">₹${Number(parsedGstDetails.igst).toFixed(2)}</td>
            </tr>` : ''}
            <tr style="border-top: 1px solid #d1d5db;">
              <td style="padding: 8px 0; color: #374151; font-weight: bold;">Total GST:</td>
              <td style="padding: 8px 0; color: #f59e0b; font-weight: bold; text-align: right;">₹${Number(parsedGstDetails.total).toFixed(2)}</td>
            </tr>
          </table>
        </div>` : ''}

        ${parsedItems.length > 0 ? `
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0ea5e9;">
          <h3 style="color: #0c4a6e; margin-top: 0;">📦 Items</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb; color: #374151;">Item</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: #374151;">Qty</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb; color: #374151;">Rate</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb; color: #374151;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${parsedItems.map(item => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; color: #111827;">${escapeHtml(String(item.stockItem || ''))}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #111827;">${Number(item.quantity).toFixed(2)} ${escapeHtml(String(item.unit || ''))}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">₹${Number(item.rate).toFixed(2)}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: bold;">₹${Number(item.amount).toFixed(2)}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
          <p style="color: #166534; margin: 0; font-size: 16px;">
            📎 Please find the detailed PDF invoice attached to this email.
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
          <p style="margin: 5px 0;">Thank you for your business! 🙏</p>
          <p style="margin: 5px 0; font-size: 14px;">Best regards,<br><strong>${safeCompanyName}</strong></p>
        </div>
      </div>
    `;

    const textContent = `
Invoice Details

Invoice Number: ${safeInvoiceNumber}
Date: ${safeDate}
Customer: ${safeCustomerName}
Total Amount: ₹${safeAmount}

${parsedGstDetails ? `GST Breakdown:
${parsedGstDetails.cgst > 0 ? `CGST: ₹${Number(parsedGstDetails.cgst).toFixed(2)}` : ''}
${parsedGstDetails.sgst > 0 ? `SGST: ₹${Number(parsedGstDetails.sgst).toFixed(2)}` : ''}
${parsedGstDetails.igst > 0 ? `IGST: ₹${Number(parsedGstDetails.igst).toFixed(2)}` : ''}
Total GST: ₹${Number(parsedGstDetails.total).toFixed(2)}` : ''}

${parsedItems.length > 0 ? `Items:
${parsedItems.map(item => `• ${String(item.stockItem || '')}: ${Number(item.quantity).toFixed(2)} ${String(item.unit || '')} @ ₹${Number(item.rate).toFixed(2)} = ₹${Number(item.amount).toFixed(2)}`).join('\n')}` : ''}

Please find the detailed PDF invoice attached to this email.

Thank you for your business!
Best regards,
${safeCompanyName}
    `;

    // Email options
    const mailOptions = {
      from: EMAIL_CONFIG.auth.user,
      to: recipientEmail,
      subject: subject,
      text: textContent,
      html: htmlContent,
      attachments: []
    };

    // Add PDF attachment if provided
    if (req.file) {
      mailOptions.attachments.push({
        filename: `Invoice_${safeInvoiceNumber}.pdf`,
        content: req.file.buffer,
        contentType: 'application/pdf'
      });
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', info.messageId);
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Do NOT expose internal error details to client
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email. Please try again.' 
    });
  }
});

// Health check endpoint
app.get('/api/email/health', (req, res) => {
  res.json({ status: 'Email server is running', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 Email server running on http://localhost:${port}`);
  console.log(`📧 Configure your email credentials in EMAIL_CONFIG or environment variables`);
  console.log(`   EMAIL_USER: ${EMAIL_CONFIG.auth.user}`);
  console.log(`   EMAIL_PASS: ${EMAIL_CONFIG.auth.pass.length > 0 ? '*'.repeat(EMAIL_CONFIG.auth.pass.length) : 'NOT_SET'}`);
});
