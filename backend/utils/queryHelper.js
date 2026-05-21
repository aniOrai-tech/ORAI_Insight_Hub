/**
 * Query Helper
 * Centralized logic for building MongoDB search queries across models
 */

/**
 * Build a search filter object based on the resource type and query string
 * @param {string} resource - The model/resource name
 * @param {string} search - The search string
 * @returns {object} MongoDB filter object
 */
const buildSearchFilter = (resource, search) => {
  if (!search) return {};

  const searchRegex = { $regex: search, $options: 'i' };

  switch (resource) {
    case 'Invoice':
      return {
        $or: [
          { invoiceNumber: searchRegex },
          { clientName: searchRegex },
          { status: searchRegex }
        ]
      };
    case 'Payment':
      return {
        $or: [
          { paymentId: searchRegex },
          { clientName: searchRegex },
          { invoiceNumber: searchRegex },
          { transactionId: searchRegex }
        ]
      };
    case 'Expense':
      return {
        $or: [
          { expenseId: searchRegex },
          { vendor: searchRegex },
          { description: searchRegex },
          { category: searchRegex }
        ]
      };
    case 'Client':
      return {
        $or: [
          { companyName: searchRegex },
          { legalName: searchRegex },
          { spocName: searchRegex },
          { email: searchRegex },
          { contactNumber: searchRegex }
        ]
      };
    case 'Bot':
      return {
        $or: [
          { clientName: searchRegex },
          { accountId: searchRegex },
          { number: searchRegex },
          { namespace: searchRegex }
        ]
      };
    case 'Requirement':
      return {
        $or: [
          { accountName: searchRegex },
          { accountManagerName: searchRegex },
          { usecaseSummary: searchRegex },
          { timeInvested: searchRegex }
        ]
      };
    case 'Upsell':
      return {
        $or: [
          { clientName: searchRegex },
          { proposal: searchRegex },
          { utrNumber: searchRegex }
        ]
      };
    case 'DailyTask':
      return {
        $or: [
          { activity: searchRegex },
          { comments: searchRegex }
        ]
      };
    case 'Meeting':
      return {
        $or: [
          { title: searchRegex },
          { clientName: searchRegex },
          { organizer: searchRegex },
          { summary: searchRegex }
        ]
      };
    case 'Member':
      return {
        $or: [
          { fullName: searchRegex },
          { username: searchRegex },
          { email: searchRegex },
          { department: searchRegex }
        ]
      };
    case 'Ticket':
      return {
        $or: [
          { ticketId: searchRegex },
          { subject: searchRegex },
          { description: searchRegex },
          { customerName: searchRegex }
        ]
      };
    case 'WhatsApp':
      return {
        $or: [
          { companyLegalName: searchRegex },
          { clientEmail: searchRegex },
          { whatsAppNumber: searchRegex },
          { fbm: searchRegex }
        ]
      };
    case 'HealthCheck':
      return {
        $or: [
          { customerName: searchRegex },
          { cstPoc: searchRegex },
          { channelsLiveOn: searchRegex },
          { paymentStatus: searchRegex }
        ]
      };
    default:
      return {};
  }
};

module.exports = { buildSearchFilter };
