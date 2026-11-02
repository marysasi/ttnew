/**
 * College Timetable Generator - Export & File Utilities v3.0
 * Excel (.xlsx), CSV Import/Export, Other-Dept Locked Load, Saturday Period 5 handling & Print Styling.
 */

(function (window) {
  'use strict';

  const ExportUtils = {
    /**
     * Download Excel Template for Faculty Bulk Upload
     */
    downloadFacultyTemplate(format = 'xlsx') {
      const data = [
        {
          'Employee ID': 'EMP201',
          'Faculty Name': 'Dr. Anita Desai',
          'Department': 'CSE',
          'Designation': 'Associate Professor',
          'Max Workload Hours': 18,
          'Email': 'anita.d@college.edu',
        },
        {
          'Employee ID': 'EMP202',
          'Faculty Name': 'Prof. Manoj Bhargav',
          'Department': 'IT',
          'Designation': 'Assistant Professor',
          'Max Workload Hours': 20,
          'Email': 'manoj.b@college.edu',
        },
        {
          'Employee ID': 'EMP203',
          'Faculty Name': 'Dr. Sunita Rao',
          'Department': 'S&H',
          'Designation': 'Professor (Maths)',
          'Max Workload Hours': 16,
          'Email': 'sunita.r@college.edu',
        },
      ];

      if (window.XLSX && format === 'xlsx') {
        const ws = window.XLSX.utils.json_to_sheet(data);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Faculty_Template');
        window.XLSX.writeFile(wb, 'college_faculty_template.xlsx');
      } else {
        this._downloadCSV(data, 'college_faculty_template.csv');
      }
    },

    /**
     * Download Excel Template for Subjects Bulk Upload
     */
    downloadSubjectTemplate(format = 'xlsx') {
      const data = [
        {
          'Subject Code': 'CS301',
          'Subject Name': 'Database Management Systems',
          'Year': 3,
          'Department': 'CSE',
          'Theory Hours Per Week': 4,
          'Lab Hours Per Week': 0,
          'Is Lab (TRUE/FALSE)': 'FALSE',
        },
        {
          'Subject Code': 'CS305L',
          'Subject Name': 'DBMS & SQL Laboratory',
          'Year': 3,
          'Department': 'CSE',
          'Theory Hours Per Week': 0,
          'Lab Hours Per Week': 3,
          'Is Lab (TRUE/FALSE)': 'TRUE',
        },
        {
          'Subject Code': 'MA201',
          'Subject Name': 'Discrete Mathematics',
          'Year': 2,
          'Department': 'S&H',
          'Theory Hours Per Week': 4,
          'Lab Hours Per Week': 0,
          'Is Lab (TRUE/FALSE)': 'FALSE',
        },
      ];

      if (window.XLSX && format === 'xlsx') {
        const ws = window.XLSX.utils.json_to_sheet(data);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Subjects_Template');
        window.XLSX.writeFile(wb, 'college_subjects_template.xlsx');
      } else {
        this._downloadCSV(data, 'college_subjects_template.csv');
      }
    },

    /**
     * Parse uploaded Excel or CSV file
     */
    parseFile(file) {
      return new Promise((resolve, reject) => {
        if (!window.XLSX) {
          reject(new Error('SheetJS library is not loaded.'));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = window.XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            resolve(json);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });
    },

    /**
     * Normalize and validate imported faculty data
     */
    normalizeFacultyImport(rawRows) {
      const valid = [];
      const errors = [];

      rawRows.forEach((row, idx) => {
        const keys = Object.keys(row);
        const findVal = (patterns) => {
          for (const pattern of patterns) {
            const match = keys.find((k) => k.trim().toLowerCase() === pattern.toLowerCase());
            if (match && row[match] !== undefined && row[match] !== '') return row[match];
          }
          return '';
        };

        const name = String(findVal(['Faculty Name', 'Name', 'Faculty', 'Teacher Name', 'Staff Name'])).trim();
        const department = String(findVal(['Department', 'Dept', 'Branch'])).trim() || 'CSE';
        const designation = String(findVal(['Designation', 'Role', 'Title'])).trim() || 'Assistant Professor';
        const empId = String(findVal(['Employee ID', 'Emp ID', 'EmpId', 'ID'])).trim() || 'FAC' + Math.floor(100 + Math.random() * 900);
        const email = String(findVal(['Email', 'Mail', 'Email ID'])).trim() || '';
        const rawHours = findVal(['Max Workload Hours', 'Max Workload', 'Max Hours', 'Hours', 'Workload']);
        const maxWorkloadHours = Number(rawHours) > 0 ? Number(rawHours) : 18;

        if (!name) {
          errors.push(`Row ${idx + 2}: Missing Faculty Name`);
          return;
        }

        valid.push({
          id: 'fac-' + Math.random().toString(36).substring(2, 9),
          empId,
          name,
          department,
          designation,
          email,
          maxWorkloadHours,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
          externalLoads: [],
        });
      });

      return { valid, errors };
    },

    /**
     * Normalize and validate imported subjects data
     */
    normalizeSubjectImport(rawRows) {
      const valid = [];
      const errors = [];

      rawRows.forEach((row, idx) => {
        const keys = Object.keys(row);
        const findVal = (patterns) => {
          for (const pattern of patterns) {
            const match = keys.find((k) => k.trim().toLowerCase() === pattern.toLowerCase());
            if (match && row[match] !== undefined && row[match] !== '') return row[match];
          }
          return '';
        };

        const code = String(findVal(['Subject Code', 'Code', 'Sub Code'])).trim().toUpperCase();
        const name = String(findVal(['Subject Name', 'Name', 'Subject', 'Course Name'])).trim();
        const year = Number(findVal(['Year', 'Yr', 'Academic Year'])) || 1;
        const department = String(findVal(['Department', 'Dept', 'Branch'])).trim() || 'CSE';
        const theoryHours = Number(findVal(['Theory Hours Per Week', 'Theory Hours', 'Theory', 'Th Hours'])) || 0;
        const labHours = Number(findVal(['Lab Hours Per Week', 'Lab Hours', 'Lab', 'Practical Hours'])) || 0;
        const isLabVal = String(findVal(['Is Lab (TRUE/FALSE)', 'Is Lab', 'IsLab', 'Lab Flag'])).trim().toLowerCase();
        const isLab = isLabVal === 'true' || isLabVal === 'yes' || isLabVal === '1' || (labHours > 0 && theoryHours === 0);

        if (!code || !name) {
          errors.push(`Row ${idx + 2}: Missing Subject Code or Subject Name`);
          return;
        }

        valid.push({
          id: 'sub-' + Math.random().toString(36).substring(2, 9),
          code,
          name,
          year: Math.min(Math.max(year, 1), 4),
          department,
          theoryHoursPerWeek: isLab ? 0 : theoryHours || 4,
          labHoursPerWeek: isLab ? labHours || 3 : labHours,
          isLab,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        });
      });

      return { valid, errors };
    },

    /**
     * Export Master Timetable to Multi-Tab Excel Workbook
     */
    exportMasterToExcel(timetable, sections, subjects, faculty, allocations, scheduleConfig, collegeName = 'COLLEGE OF ENGINEERING & TECHNOLOGY') {
      if (!window.XLSX) {
        alert('SheetJS is not loaded. Cannot export to Excel.');
        return;
      }

      const wb = window.XLSX.utils.book_new();
      const config = scheduleConfig || window.TimetableCore.DEFAULT_SCHEDULE_CONFIG;
      const facultyMap = {};
      faculty.forEach((f) => (facultyMap[f.id] = f));
      const activeAllocations = allocations || window.TimetableCore.DEFAULT_ALLOCATIONS;

      // 1. Create a worksheet for each Section
      sections.forEach((sec) => {
        const secTimetable = timetable ? timetable[sec.id] : null;
        if (!secTimetable) return;

        const sheetData = [];
        sheetData.push([collegeName]);
        sheetData.push([`DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING`]);
        sheetData.push([`CLASS TIMETABLE: Year ${sec.year} - ${sec.name} | Room: ${sec.roomNumber || 'N/A'}`]);
        sheetData.push([`Class Mentor: ${sec.mentorFacultyId && facultyMap[sec.mentorFacultyId] ? facultyMap[sec.mentorFacultyId].name : 'Not Assigned'}`]);
        sheetData.push([`Note: Saturday is strictly 4 hours only (Periods 1–4 active; Periods 5–7 closed / inactive) as per academic schedule rules.`]);
        sheetData.push([]); // blank row

        const headerRow = ['Day / Period'];
        config.periods.forEach((p) => {
          headerRow.push(`${p.name}\n(${p.time})`);
          if (p.id === config.lunchBreak.afterPeriod) {
            headerRow.push(`LUNCH BREAK\n(${config.lunchBreak.time})`);
          }
        });
        sheetData.push(headerRow);

        config.days.forEach((day) => {
          const row = [day];

          config.periods.forEach((p) => {
            const isDisabled = window.TimetableCore.TallyEngine.isSlotDisabled(day, p.id, config);
            if (isDisabled) {
              row.push('HALF DAY / CLOSED');
            } else {
              const cell = secTimetable[day] ? secTimetable[day][p.id] : null;
              if (cell) {
                const fac = cell.facultyNames && cell.facultyNames.length > 0 ? `\n[${cell.facultyNames.join(', ')}]` : '';
                row.push(`${cell.subjectCode || cell.label} - ${cell.subjectName || ''}${fac}`);
              } else {
                row.push('Free');
              }
            }

            if (p.id === config.lunchBreak.afterPeriod) {
              row.push('LUNCH BREAK');
            }
          });

          sheetData.push(row);
        });

        // Subject Legend table
        sheetData.push([]);
        sheetData.push(['CURRICULUM COURSES & ALLOCATION:']);
        sheetData.push(['Course Code', 'Course Name', 'Type', 'Hours/Wk', 'Faculty Incharge']);
        const secSubjects = subjects.filter((s) => s.year === sec.year);
        secSubjects.forEach((sub) => {
          const alloc = activeAllocations.find((a) => a.sectionId === sec.id && a.subjectId === sub.id);
          const facNames = alloc && alloc.facultyIds ? alloc.facultyIds.map((id) => facultyMap[id]?.name || id).join(', ') : 'Not Assigned';
          sheetData.push([
            sub.code,
            sub.name,
            sub.isLab ? 'Laboratory' : 'Theory',
            (sub.theoryHoursPerWeek || 0) + (sub.labHoursPerWeek || 0),
            facNames,
          ]);
        });

        const safeSheetName = `${sec.year}Yr_${sec.name.replace(/\s+/g, '')}`.substring(0, 31);
        const ws = window.XLSX.utils.aoa_to_sheet(sheetData);
        ws['!cols'] = [{ wch: 15 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 24 }];
        window.XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
      });

      // 2. Master Consolidated Summary Sheet
      const masterData = [];
      masterData.push([collegeName]);
      masterData.push(['MASTER CONSOLIDATED COLLEGE TIMETABLE']);
      masterData.push([`* Note: Saturday strictly 4 hours (Periods 1–4 active; Periods 5–7 closed / inactive) across all sections.`]);
      masterData.push([]);

      sections.forEach((sec) => {
        masterData.push([`>>> ${sec.year === 1 ? '1st' : sec.year === 2 ? '2nd' : sec.year === 3 ? '3rd' : '4th'} Year - ${sec.name} (Room: ${sec.roomNumber || 'N/A'})`]);
        const secTimetable = timetable ? timetable[sec.id] : null;
        if (!secTimetable) return;

        const headerRow = ['Day'];
        config.periods.forEach((p) => {
          headerRow.push(p.name);
          if (p.id === config.lunchBreak.afterPeriod) headerRow.push('LUNCH');
        });
        masterData.push(headerRow);

        config.days.forEach((day) => {
          const row = [day];
          config.periods.forEach((p) => {
            const isDisabled = window.TimetableCore.TallyEngine.isSlotDisabled(day, p.id, config);
            if (isDisabled) {
              row.push('CLOSED');
            } else {
              const cell = secTimetable[day] ? secTimetable[day][p.id] : null;
              if (cell) {
                row.push(`${cell.subjectCode} (${(cell.facultyNames || []).join('/') || '-'})`);
              } else {
                row.push('-');
              }
            }
            if (p.id === config.lunchBreak.afterPeriod) row.push('|');
          });
          masterData.push(row);
        });
        masterData.push([]);
      });

      const masterWs = window.XLSX.utils.aoa_to_sheet(masterData);
      window.XLSX.utils.book_append_sheet(wb, masterWs, 'Master_Consolidated');

      // 3. Faculty Workload & External Other-Dept Load Report Sheet
      const facData = [];
      facData.push([collegeName]);
      facData.push(['FACULTY TEACHING WORKLOAD & OTHER-DEPARTMENT LOCKED LOAD REPORT']);
      facData.push([]);
      facData.push([
        'Emp ID',
        'Faculty Name',
        'Department',
        'Designation',
        'Internal Teaching (hrs)',
        'Other Dept Locked (hrs)',
        'Total Assigned (hrs)',
        'Max Workload (hrs)',
        'Utilization %',
        'Status',
        'External Load Details (Day / Period / Dept)',
      ]);

      const workloads = window.TimetableCore.WorkloadEngine.calculateFacultyWorkloads(faculty, subjects, activeAllocations);

      faculty.forEach((fac) => {
        const item = workloads[fac.id] || {
          totalInternalAssigned: 0,
          externalHours: 0,
          totalAssigned: 0,
          maxWorkload: fac.maxWorkloadHours,
        };
        const util = Math.round((item.totalAssigned / item.maxWorkload) * 100);

        const extDetailStr = (fac.externalLoads || [])
          .map((ext) => `${ext.day} P${ext.period}: ${ext.department} (${ext.subject})`)
          .join('; ') || 'None';

        facData.push([
          fac.empId || 'N/A',
          fac.name,
          fac.department,
          fac.designation,
          item.totalInternalAssigned,
          item.externalHours,
          item.totalAssigned,
          item.maxWorkload,
          `${util}%`,
          item.totalAssigned > item.maxWorkload ? 'OVERLOADED' : 'NORMAL',
          extDetailStr,
        ]);
      });

      const facWs = window.XLSX.utils.aoa_to_sheet(facData);
      facWs['!cols'] = [
        { wch: 12 },
        { wch: 22 },
        { wch: 14 },
        { wch: 20 },
        { wch: 22 },
        { wch: 22 },
        { wch: 20 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 45 },
      ];
      window.XLSX.utils.book_append_sheet(wb, facWs, 'Faculty_Workload');

      const dateStr = new Date().toISOString().slice(0, 10);
      window.XLSX.writeFile(wb, `College_Master_Timetable_${dateStr}.xlsx`);
    },

    _downloadCSV(data, filename) {
      if (!data || !data.length) return;
      const headers = Object.keys(data[0]);
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          headers.join(','),
          ...data.map((row) =>
            headers
              .map((h) => {
                let cell = row[h] === null || row[h] === undefined ? '' : String(row[h]);
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                  cell = `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
              })
              .join(',')
          ),
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  };

  window.ExportUtils = ExportUtils;
})(window);
