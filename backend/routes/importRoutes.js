const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Meeting = require('../models/Meeting');
const WhatsAppDetails = require('../models/WhatsAppDetails');
const HealthCheck = require('../models/HealthCheck');
const { Bot, Client } = require('../models/index');
const { protect, checkPermission } = require('../middleware/auth');
const { sanitizePayload } = require('../services/mappers/accountMapper');

const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

/**
 * POST /api/import/:module
 * Import Excel/CSV data for a specific module
 */
router.post('/:module', upload.single('file'), async (req, res, next) => {
  try {
    const { module } = req.params;
    console.log(`[UPLOAD REQUEST RECEIVED] Module: ${module}, User: ${req.user.username}`);

    if (!req.file) {
      console.log('[UPLOAD FAILED] No file attached to request');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log(`[FILE DETECTED] Name: ${req.file.originalname}, Size: ${req.file.size} bytes, MIME: ${req.file.mimetype}`);
    console.log('[UPLOAD PROCESS STARTED] Parsing spreadsheet...');

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`[PARSE COMPLETE] Sheet: "${sheetName}", Rows found: ${data.length}`);

    if (data.length === 0) {
      console.log('[UPLOAD FAILED] Spreadsheet is empty or has no data rows');
      return res.status(400).json({ success: false, message: 'Spreadsheet is empty or has no data rows. Ensure the first row contains column headers.' });
    }

    let results = [];
    let count = 0;
    let skippedCount = 0;

    switch (module) {
      case 'meetings':
        for (const item of data) {
          const scheduledDate = new Date(item['Date'] || item['Scheduled Date']);
          const header = item['Header'] || item['Title'] || item['Meeting'];
          const clientName = item['Client Name'] || item['Client'];

          // Duplicate check
          const exists = await Meeting.exists({ header, scheduledDate, clientName });
          if (exists) { skippedCount++; continue; }

          const expiryDate = new Date(scheduledDate);
          expiryDate.setDate(expiryDate.getDate() + 60);

          await Meeting.create({
            header,
            clientName,
            summary: item['Summary'],
            transcript: item['Transcript'],
            scheduledDate,
            expiryDate,
            ownerEmail: item['Owner Email'] || item['Email'],
            department: item['Department'] || req.user.department,
            createdBy: req.user._id,
            source: 'manual',
            status: 'active'
          });
          count++;
        }
        break;

      case 'whatsapp':
        for (const item of data) {
          const whatsAppNumber = item['WhatsApp'] || item['WhatsApp Number'];
          if (!whatsAppNumber) continue;

          const exists = await WhatsAppDetails.exists({ whatsAppNumber });
          if (exists) { skippedCount++; continue; }

          await WhatsAppDetails.create({
            companyLegalName: item['Company Legal Name'] || item['Company'],
            customerType: item['Customer Type'],
            whatsAppNumber,
            clientEmail: item['Client Email'],
            password: item['Password'],
            api: item['API'],
            namespace: item['Namespace'],
            status: (item['Status'] || 'active').toLowerCase(),
            closeDate: item['Close Date'] ? new Date(item['Close Date']) : null,
            fbm: item['FBM'],
            fbmDate: item['Date'] ? new Date(item['Date']) : null,
            hostingPlatformType: item['Hosting Platform Type'] || item['Platform'],
            remarkStatus: item['Remark - status'] || item['Remark'],
            createdBy: req.user._id
          });
          count++;
        }
        break;

      case 'healthchecks':
        for (const item of data) {
          const monthYear = item['Month'] || item['MonthYear'];
          const customerName = item['Customer name'] || item['Customer'];

          const exists = await HealthCheck.exists({ monthYear, customerName });
          if (exists) { skippedCount++; continue; }

          await HealthCheck.create({
            monthYear,
            cstPoc: item['CSTPOC'] || item['POC'],
            customerName,
            customerType: item['Customer Type'],
            status: (item['status'] || 'active').toLowerCase(),
            channelsLiveOn: item['Channels Live On'] || item['Channels'],
            updateStatus: item['Update/Status'],
            dateOfCall1: item['Date of call 1'] ? new Date(item['Date of call 1']) : null,
            platformUsageRemark: item['Platform usage Remark'],
            dateOfCall2: item['Date of call 2'] ? new Date(item['Date of call 2']) : null,
            remark2: item['Remark'],
            dateOfCall3: item['Date of call 3'] ? new Date(item['Date of call 3']) : null,
            remark3: item['Remark '], 
            emailSent: !!item['Email Sent'],
            createdBy: req.user._id
          });
          count++;
        }
        break;

      case 'bots':
        for (const item of data) {
          const accountId = item['Account ID'] || item['AccountID'];
          if (!accountId) continue;

          const exists = await Bot.exists({ accountId });
          if (exists) { skippedCount++; continue; }

          const botData = {
            clientName: item['Client Name'] || item['Client'],
            accountId,
            password: item['Password'],
            apiKey: item['API Key'] || item['ApiKey'],
            namespace: item['Namespace'],
            number: item['Number'] || item['Phone'],
            accountType: item['Account Type'] || item['Type'] || 'standard',
            remark: item['Integration'] || item['Remark'] || 'None',
            smartLink: item['Smart Link'] || item['Link'],
            isActive: item['Status'] ? item['Status'].toLowerCase() === 'active' : true,
            goLiveDate: item['Go Live Date'] ? new Date(item['Go Live Date']) : null,
            department: item['Department'] || req.user.department,
            createdBy: req.user._id
          };
          const sanitizedBot = sanitizePayload(botData, 'Bot');
          await Bot.create(sanitizedBot);
          count++;
        }
        break;

      case 'clients':
        for (const item of data) {
          const email = item['Email'] || item['Client Email'];
          if (!email) continue;

          const exists = await Client.exists({ email });
          if (exists) { skippedCount++; continue; }

          await Client.create({
            spocName: item['SPOC Name'] || item['Contact Person'] || item['Contact'] || item['Name'],
            email,
            contactNumber: item['Contact Number'] || item['Phone'] || item['Mobile'] || '',
            companyName: item['Company Name'] || item['Company'],
            accountId: item['Account ID'] || item['AccountID'],
            notes: item['Notes'] || item['Remark'],
            department: item['Department'] || req.user.department,
            createdBy: req.user._id
          });
          count++;
        }
        break;

      case 'tickets':
        for (const item of data) {
          const subject = item['Subject'] || item['Title'];
          const contactEmail = item['Email'];

          // Check for duplicate tickets created today with same subject/email
          const today = new Date();
          today.setHours(0,0,0,0);
          const exists = await require('../models/Ticket').exists({ 
            subject, 
            contactEmail,
            createdAt: { $gte: today }
          });
          if (exists) { skippedCount++; continue; }

          const priority = item['Priority'] || 'medium';
          const slaHours = { critical: 4, high: 8, medium: 24, low: 48 };
          const hours = slaHours[priority.toLowerCase()] || 24;
          const slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);

          const ticketData = {
            subject,
            description: item['Description'] || item['Detail'],
            status: item['Status'] || 'open',
            priority,
            category: item['Category'] || 'support',
            clientName: item['Client'] || item['Company'],
            contactEmail,
            slaDeadline,
            department: item['Department'] || req.user.department,
            createdBy: req.user._id
          };
          const sanitizedTicket = sanitizePayload(ticketData, 'Ticket');
          await require('../models/Ticket').create(sanitizedTicket);
          count++;
        }
        break;

      case 'invoices':
        for (const item of data) {
          const clientEmail = item['Email'];
          const grandTotal = parseFloat(item['Amount'] || item['Total'] || 0);
          
          const exists = await require('../models/Invoice').exists({ clientEmail, grandTotal, status: item['Status'] || 'draft' });
          if (exists) { skippedCount++; continue; }

          const dueDate = item['Due Date'] ? new Date(item['Due Date']) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
          const invoiceData = {
            clientName: item['Client'] || item['Company'],
            clientEmail,
            grandTotal,
            balanceDue: grandTotal,
            dueDate,
            status: item['Status'] || 'draft',
            department: item['Department'] || req.user.department,
            createdBy: req.user._id
          };
          const sanitizedInvoice = sanitizePayload(invoiceData, 'Invoice');
          await require('../models/Invoice').create(sanitizedInvoice);
          count++;
        }
        break;

      case 'expenses':
        for (const item of data) {
          const description = item['Description'] || item['Expense'];
          const amount = parseFloat(item['Amount'] || 0);

          const exists = await require('../models/Expense').exists({ description, amount });
          if (exists) { skippedCount++; continue; }

          const expenseData = {
            description,
            amount,
            category: item['Category'] || 'other',
            vendor: item['Vendor'] || item['Payee'],
            date: item['Date'] ? new Date(item['Date']) : new Date(),
            status: 'approved',
            department: item['Department'] || req.user.department,
            createdBy: req.user._id
          };
          const sanitizedExpense = sanitizePayload(expenseData, 'Expense');
          await require('../models/Expense').create(sanitizedExpense);
          count++;
        }
        break;

      default:
        console.log(`[UPLOAD FAILED] Invalid module: "${module}"`);
        return res.status(400).json({ success: false, message: `Invalid module: "${module}". Supported: meetings, whatsapp, healthchecks, bots, clients` });
    }

    console.log(`[DB SAVE SUCCESS] Processed ${data.length} records. Inserted: ${count}, Skipped: ${skippedCount}`);
    res.json({ 
      success: true, 
      message: `Successfully imported ${count} records into ${module}.${skippedCount > 0 ? ` Skipped ${skippedCount} duplicate(s).` : ''}` 
    });
  } catch (error) {
    console.error('[IMPORT ERROR]', error.message);

    // Provide user-friendly messages for common errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join('; ');
      return res.status(400).json({ success: false, message: `Validation failed: ${messages}` });
    }
    if (error.message && error.message.includes('is not a function')) {
      return res.status(500).json({ success: false, message: 'Internal model error. Please contact support.' });
    }

    res.status(500).json({ success: false, message: 'Import failed: ' + error.message });
  }
});

module.exports = router;
