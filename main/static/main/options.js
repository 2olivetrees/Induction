const DEFAULT_DAYS = [0, 1, 2, 3, 4, 5, 6];

function loadDayPrefs() {
  try {
    const saved = localStorage.getItem('cal_days');
    return saved ? JSON.parse(saved) : DEFAULT_DAYS;
  } catch(e) { return DEFAULT_DAYS; }
}

function saveDayPrefs() {
  const checked = [...document.querySelectorAll('#dayOptionsForm input[type=checkbox]:checked')]
    .map(cb => parseInt(cb.value));
  if (checked.length === 0) {
    alert('Please select at least one day.');
    return;
  }
  localStorage.setItem('cal_days', JSON.stringify(checked));
  alert('Saved!');
}

// Check the boxes on page load to reflect current preference
document.addEventListener('DOMContentLoaded', () => {
  const prefs = loadDayPrefs();
  document.querySelectorAll('#dayOptionsForm input[type=checkbox]').forEach(cb => {
    cb.checked = prefs.includes(parseInt(cb.value));
  });
});