/**
 * Account Mapper Service
 * Centralized logic for sanitizing payloads, normalizing enums, and mapping upload data.
 */

const ENUM_MAPS = {
  accountType: {
    allowed: ['standard', 'premium', 'enterprise', 'trial'],
    default: 'standard'
  },
  remark: {
    allowed: ['CRM Integration', 'GSheet Integration', 'External API Integration', 'None'],
    default: 'None'
  },
  status: {
    // Shared for Upsell and Requirements (and potentially others)
    allowed: ['pending', 'negotiation', 'closed_won', 'closed_lost', 'new', 'in_review', 'in_progress', 'completed', 'rejected', 'open', 'resolved', 'closed', 'draft', 'overdue', 'paid'],
    default: (val, field, model) => {
      if (model === 'Upsell') return 'pending';
      if (model === 'Requirement') return 'new';
      if (model === 'Ticket') return 'open';
      if (model === 'Invoice') return 'draft';
      return 'active';
    }
  },
  priority: {
    allowed: ['low', 'medium', 'high', 'urgent', 'critical'],
    default: 'medium'
  }
};

/**
 * Sanitizes a payload based on model-specific enum requirements
 * @param {Object} payload - The raw data object
 * @param {String} modelName - Name of the Mongoose model
 * @returns {Object} Sanitized payload
 */
function sanitizePayload(payload, modelName) {
  const sanitized = { ...payload };

  Object.keys(ENUM_MAPS).forEach(field => {
    if (sanitized[field] !== undefined) {
      const config = ENUM_MAPS[field];
      const val = String(sanitized[field]).toLowerCase();
      
      if (!config.allowed.includes(val)) {
        console.warn(`[INVALID ENUM DETECTED] Field: ${field}, Value: "${sanitized[field]}", Model: ${modelName}`);
        
        // Use default if mapping fails
        const defaultValue = typeof config.default === 'function' 
          ? config.default(val, field, modelName) 
          : config.default;
          
        sanitized[field] = defaultValue;
        console.log(`[ACCOUNTTYPE NORMALIZED] Reset to: ${defaultValue}`);
      } else {
        sanitized[field] = val; // Normalize to lowercase as per enum defs
      }
    }
  });

  return sanitized;
}

/**
 * Specifically handles the bot accountType mapping from imports
 * ensuring we don't accidentally map organization names into enums.
 */
function mapBotAccount(item) {
  const accountTypeRaw = item['Account Type'] || item['Type'] || '';
  const accountType = sanitizeValue(accountTypeRaw, ENUM_MAPS.accountType);
  
  return {
    clientName: item['Client Name'] || item['Client'],
    accountId: item['Account ID'] || item['AccountID'],
    accountType: accountType,
    // Add other fields as needed or pass through
  };
}

function sanitizeValue(val, config) {
  if (!val) return config.default;
  const normalized = String(val).toLowerCase();
  return config.allowed.includes(normalized) ? normalized : config.default;
}

module.exports = {
  sanitizePayload,
  mapBotAccount,
  ENUM_MAPS
};
