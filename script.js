const STORAGE_KEY = 'simple-timetable-app-data';
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const entryForm = document.getElementById('entryForm');
const messageEl = document.getElementById('message');
const timetableWrapper = document.getElementById('timetableWrapper');
const facultyTimetableWrapper = document.getElementById('facultyTimetableWrapper');
const availabilityResult = document.getElementById('availabilityResult');

const yearSelect = document.getElementById('yearSelect');
const sectionSelect = document.getElementById('sectionSelect');
const daySelect = document.getElementById('daySelect');
const periodSelect = document.getElementById('periodSelect');
const durationSelect = document.getElementById('durationSelect');
const subjectInput = document.getElementById('subjectInput');
const staffInput = document.getElementById('staffInput');

const viewYearSelect = document.getElementById('viewYearSelect');
const viewSectionSelect = document.getElementById('viewSectionSelect');

const facultySelect = document.getElementById('facultySelect');

const checkDaySelect = document.getElementById('checkDaySelect');
const checkPeriodSelect = document.getElementById('checkPeriodSelect');

let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

function getPeriodsForDay(day) {
  return day === 'Saturday' ? ['1st', '2nd', '3rd', '4th'] : ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? '#b91c1c' : '#0f766e';
}

function populatePeriodOptions(selectEl, day) {
  const periods = getPeriodsForDay(day);
  const currentValue = selectEl.value;
  selectEl.innerHTML = periods.map((period) => `<option value="${period}">${period} Period</option>`).join('');
  selectEl.value = periods.includes(currentValue) ? currentValue : periods[0];
}

function populateStaffOptions() {
  const staffNames = [...new Set(entries.map((entry) => entry.staff).filter(Boolean))];
  const currentValue = facultySelect.value;
  facultySelect.innerHTML = staffNames.length
    ? staffNames.map((staff) => `<option value="${staff}">${staff}</option>`).join('')
    : '<option value="">No faculty added yet</option>';
  if (staffNames.includes(currentValue)) {
    facultySelect.value = currentValue;
  } else if (staffNames.length) {
    facultySelect.value = staffNames[0];
  }
}

function addEntry(event) {
  event.preventDefault();

  const subject = subjectInput.value.trim();
  const staff = staffInput.value.trim();
  const duration = Number(durationSelect.value);

  if (!subject || !staff) {
    showMessage('Please enter both a subject and staff name.', true);
    return;
  }

  const day = daySelect.value;
  const startPeriod = periodSelect.value;
  const periods = getPeriodsForDay(day);
  const startIndex = periods.indexOf(startPeriod);

  if (startIndex === -1) {
    showMessage('Please choose a valid period for this day.', true);
    return;
  }

  if (startIndex + duration > periods.length) {
    showMessage(`This day only allows ${periods.length} periods. Choose an earlier start period for a ${duration}-hour slot.`, true);
    return;
  }

  for (let offset = 0; offset < duration; offset += 1) {
    const period = periods[startIndex + offset];
    const existing = entries.find((item) => {
      return (
        item.year === yearSelect.value &&
        item.section === sectionSelect.value &&
        item.day === day &&
        item.period === period
      );
    });

    if (existing) {
      showMessage(`The slot for ${day} ${period} is already occupied.`, true);
      return;
    }
  }

  for (let offset = 0; offset < duration; offset += 1) {
    const period = periods[startIndex + offset];
    entries.push({
      year: yearSelect.value,
      section: sectionSelect.value,
      day,
      period,
      subject,
      staff,
      isLab: duration > 1,
      duration,
    });
  }

  saveEntries();
  renderTimetable();
  renderFacultyTimetable();
  renderAvailability();
  populateStaffOptions();
  entryForm.reset();
  yearSelect.value = '2nd';
  sectionSelect.value = 'Section A';
  daySelect.value = 'Monday';
  populatePeriodOptions(periodSelect, daySelect.value);
  durationSelect.value = '1';
  showMessage(`Added ${subject} for ${staff}.`);
}

function getFilteredEntries(year, section) {
  return entries.filter((item) => item.year === year && item.section === section);
}

function renderTimetable() {
  const year = viewYearSelect.value;
  const section = viewSectionSelect.value;
  const filtered = getFilteredEntries(year, section);
  const periodHeaders = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

  const rows = days
    .map((day) => {
      const availablePeriods = getPeriodsForDay(day);
      const cells = periodHeaders
        .map((period) => {
          if (!availablePeriods.includes(period)) {
            return '<td class="free-cell">-</td>';
          }

          const items = filtered.filter((entry) => entry.day === day && entry.period === period);
          if (!items.length) {
            return '<td class="free-cell">Free</td>';
          }

          return `<td>${items
            .map((item) => {
              const label = item.isLab ? `${item.subject} (Lab ${item.duration} hrs)` : item.subject;
              return `<strong>${label}</strong><br><span>${item.staff}</span>`;
            })
            .join('<br><br>')}</td>`;
        })
        .join('');

      return `<tr><th>${day}</th>${cells}</tr>`;
    })
    .join('');

  const heading = `<h3>${year} - ${section}</h3>`;
  timetableWrapper.innerHTML = `
    ${heading}
    <table>
      <thead>
        <tr>
          <th>Day</th>
          ${periodHeaders.map((period) => `<th>${period}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderFacultyTimetable() {
  if (!facultySelect.value) {
    facultyTimetableWrapper.innerHTML = '<p>No faculty selected.</p>';
    return;
  }

  const faculty = facultySelect.value;
  const filtered = entries.filter((entry) => entry.staff === faculty);
  const rows = getPeriodsForDay('Monday')
    .map((period) => {
      const cells = days
        .map((day) => {
          const items = filtered.filter((entry) => entry.day === day && entry.period === period);
          if (!items.length) {
            return `<td class="free-cell">Free</td>`;
          }
          return `<td>${items
            .map((item) => `<strong>${item.year} ${item.section}</strong><br>${item.subject}${item.isLab ? ` <br>Lab ${item.duration} hrs` : ''}`)
            .join('<br><br>')}</td>`;
        })
        .join('');
      return `<tr><th>${period}</th>${cells}</tr>`;
    })
    .join('');

  facultyTimetableWrapper.innerHTML = `
    <h3>${faculty}</h3>
    <table>
      <thead>
        <tr>
          <th>Period</th>
          ${days.map((day) => `<th>${day}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAvailability() {
  const day = checkDaySelect.value;
  const period = checkPeriodSelect.value;

  const isOccupied = entries.some((entry) => entry.day === day && entry.period === period);

  if (isOccupied) {
    availabilityResult.innerHTML = `<p><strong>${day}, ${period}</strong> is already booked.</p>`;
    return;
  }

  availabilityResult.innerHTML = `<p><strong>${day}, ${period}</strong> is free.</p>`;
}

entryForm.addEventListener('submit', addEntry);
daySelect.addEventListener('change', () => populatePeriodOptions(periodSelect, daySelect.value));
checkDaySelect.addEventListener('change', () => populatePeriodOptions(checkPeriodSelect, checkDaySelect.value));
viewYearSelect.addEventListener('change', renderTimetable);
viewSectionSelect.addEventListener('change', renderTimetable);
facultySelect.addEventListener('change', renderFacultyTimetable);
checkDaySelect.addEventListener('change', renderAvailability);
checkPeriodSelect.addEventListener('change', renderAvailability);
document.getElementById('checkButton').addEventListener('click', renderAvailability);

populatePeriodOptions(periodSelect, daySelect.value);
populatePeriodOptions(checkPeriodSelect, checkDaySelect.value);
populateStaffOptions();
renderTimetable();
renderFacultyTimetable();
renderAvailability();
