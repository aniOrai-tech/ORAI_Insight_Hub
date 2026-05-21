window.TaskPagination = function(pagination) {
  const { page, pages, total } = pagination;
  if (pages <= 1) return '';

  const prevDisabled = page === 1 ? 'disabled' : '';
  const nextDisabled = page === pages ? 'disabled' : '';

  return `
    <div class="pagination-container" style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:15px; border-top:1px solid var(--border)">
      <div style="font-size:0.85rem; color:var(--text-muted)">
        Showing page <strong>${page}</strong> of <strong>${pages}</strong> (${total} total records)
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" ${prevDisabled} onclick="useDailyTasks.changePage(${page - 1})" style="padding:4px 12px; height:32px;">
          Previous
        </button>
        ${generatePageButtons(page, pages)}
        <button class="btn btn-ghost" ${nextDisabled} onclick="useDailyTasks.changePage(${page + 1})" style="padding:4px 12px; height:32px;">
          Next
        </button>
      </div>
    </div>
  `;
};

function generatePageButtons(current, total) {
  let buttons = '';
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      const activeClass = i === current ? 'background:var(--accent); color:white;' : '';
      buttons += `<button class="btn btn-ghost" onclick="useDailyTasks.changePage(${i})" style="width:32px; height:32px; padding:0; ${activeClass}">${i}</button>`;
    } else if (i === current - 2 || i === current + 2) {
      buttons += `<span style="padding:4px 4px; color:var(--text-muted)">...</span>`;
    }
  }
  return buttons;
}
