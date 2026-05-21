window.StatusBadge = function(status) {
  const cls = DailyTaskConstants.STATUS_COLORS[status] || 'badge-gray';
  const lbl = DailyTaskConstants.STATUS_LABELS[status] || status;
  return `<span class="badge ${cls}">${lbl}</span>`;
};
