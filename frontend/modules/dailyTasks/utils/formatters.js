/**
 * Time Utility Formatters
 */

window.DailyTaskFormatters = {
  /**
   * Converts total minutes into "Hh Mm" format
   * Example: 195 -> 3h 15m
   * Example: 0 -> 0h 00m
   */
  formatMinutesToHours: (minutes) => {
    const mins = Number(minutes || 0);
    if (isNaN(Number(minutes)) && minutes !== undefined) {
      console.log("[UNDEFINED VALUE FIXED] Invalid duration detected and normalized to 0");
    }
    const h = Math.floor(mins / 60);
    const m = String(mins % 60).padStart(2, '0');
    const result = `${h}h ${m}m`;
    console.log(`[DURATION FORMATTER EXECUTED] ${mins}m -> ${result}`);
    return result;
  },

  /**
   * Formats a 24-hour time string (e.g. "10:00" or "19:00") into 12-hour AM/PM format
   */
  formatTimeToAMPM: (time24) => {
    if (!time24) return '—';
    if (time24.toLowerCase().includes('am') || time24.toLowerCase().includes('pm')) return time24;
    const parts = time24.split(':');
    if (parts.length < 2) return time24;
    let hours = parseInt(parts[0]);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  },

  /**
   * Converts an AM/PM or arbitrary time string to a standard 24-hour HH:MM string for time inputs
   */
  convertTo24Hour: (timeStr) => {
    if (!timeStr) return '';
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return timeStr;
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const ampm = match[3];
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  },

  /**
   * Calculates the difference in minutes between two 24-hour time strings
   */
  calculateDurationMin: (login, logout) => {
    if (!login || !logout) return 0;
    const loginParts = login.split(':');
    const logoutParts = logout.split(':');
    if (loginParts.length < 2 || logoutParts.length < 2) return 0;
    const loginMins = parseInt(loginParts[0]) * 60 + parseInt(loginParts[1]);
    const logoutMins = parseInt(logoutParts[0]) * 60 + parseInt(logoutParts[1]);
    let diff = logoutMins - loginMins;
    if (diff < 0) {
      diff += 24 * 60; // Cross-day boundary
    }
    return diff;
  }
};

// Also expose as a global helper for easier access in template literals
window.formatMinutesToHours = window.DailyTaskFormatters.formatMinutesToHours;
window.formatTimeToAMPM = window.DailyTaskFormatters.formatTimeToAMPM;
window.convertTo24Hour = window.DailyTaskFormatters.convertTo24Hour;
window.calculateDurationMin = window.DailyTaskFormatters.calculateDurationMin;
