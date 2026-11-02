/**
 * College Timetable Generator - Pure Constraint Satisfaction Problem (CSP) Solver v3.0
 * Language: Pure Modern JavaScript (ES6+ / CommonJS / Universal Module)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.CollegeScheduler = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function isPeriodDisabled(day, period, scheduleConfig) {
    if (day === 'Saturday') {
      const disabled = scheduleConfig.saturdayDisabledPeriods || [5];
      if (disabled.includes(period)) return true;
      const maxP = scheduleConfig.saturdayMaxPeriods || 4;
      if (period > maxP && !disabled.includes(period)) return true;
    }
    return false;
  }

  function getActivePeriodsForDay(day, scheduleConfig) {
    const maxP =
      day === 'Saturday'
        ? scheduleConfig.saturdayMaxPeriods || 4
        : (scheduleConfig.dayPeriodsOverride && scheduleConfig.dayPeriodsOverride[day] !== undefined)
        ? scheduleConfig.dayPeriodsOverride[day]
        : scheduleConfig.periodsPerDay;

    const disabled = day === 'Saturday' ? scheduleConfig.saturdayDisabledPeriods || [5] : [];
    const list = [];
    for (let p = 1; p <= maxP; p++) {
      if (!disabled.includes(p)) list.push(p);
    }
    return list;
  }

  function validatePreFlightTally({
    sections,
    subjects,
    faculty = [],
    fixedSlots = [],
    scheduleConfig,
  }) {
    const errors = [];
    const subjectsMap = new Map(subjects.map((s) => [s.id, s]));
    const facultyMap = new Map(faculty.map((f) => [f.id, f]));
    const sectionTallies = {};

    const totalWeeklyCapacity = scheduleConfig.days.reduce(
      (sum, day) => sum + getActivePeriodsForDay(day, scheduleConfig).length,
      0
    );

    // 1. Check fixed slots
    for (const slot of fixedSlots) {
      if (isPeriodDisabled(slot.day, slot.period, scheduleConfig)) {
        errors.push(
          `Invalid fixed slot "${slot.label}" on ${slot.day} Period ${slot.period}: This period is strictly disabled / unallocatable.`
        );
      }
    }

    // 2. Section capacity reconciliation
    const facultyWorkloadMap = new Map();
    for (const fac of faculty) {
      const extHours = (fac.externalLoads || []).reduce((sum, ext) => sum + (Number(ext.hours) || 1), 0);
      facultyWorkloadMap.set(fac.id, extHours);
    }

    for (const section of sections) {
      const sectionFixed = fixedSlots.filter(
        (slot) =>
          (slot.sectionId === 'ALL' || slot.sectionId === section.id) &&
          !isPeriodDisabled(slot.day, slot.period, scheduleConfig)
      );

      const academicFixed = sectionFixed.filter((s) => s.type === 'ACADEMIC' || s.subjectId || s.isLab);
      const nonAcademicFixed = sectionFixed.filter((s) => !academicFixed.includes(s));

      let theoryHours = 0;
      let labHours = 0;

      const allocs = section.allocations || [];
      for (const alloc of allocs) {
        const sub = subjectsMap.get(alloc.subjectId);
        if (!sub) {
          errors.push(`Section "${section.name}" references non-existent subject ID "${alloc.subjectId}".`);
          continue;
        }

        const th = Number(sub.theoryHours) || 0;
        const lh = Number(sub.labHours) || 0;
        theoryHours += th;
        labHours += lh;

        const totalSubjectHours = th + lh;
        for (const fId of alloc.facultyIds) {
          facultyWorkloadMap.set(fId, (facultyWorkloadMap.get(fId) || 0) + totalSubjectHours);
        }
      }

      // Academic fixed slots count towards subject curriculum hours (theory + lab)
      // Total required to fill the section's week = (theoryHours + labHours) + nonAcademicFixedCount
      const totalAllocated = theoryHours + labHours + nonAcademicFixed.length;
      const delta = totalAllocated - totalWeeklyCapacity;

      sectionTallies[section.id] = {
        totalCapacity: totalWeeklyCapacity,
        theoryHours,
        labHours,
        fixedHours: sectionFixed.length,
        academicFixedHours: academicFixed.length,
        nonAcademicFixedHours: nonAcademicFixed.length,
        totalAllocated,
        delta,
      };

      if (delta !== 0) {
        if (delta > 0) {
          errors.push(
            `Section "${section.name}" exceeds capacity by ${delta} period(s): ` +
              `Allocated (${totalAllocated} hrs = ${theoryHours} Th + ${labHours} Lab + ${sectionFixedCount} Fixed) > Capacity (${totalWeeklyCapacity} hrs).`
          );
        } else {
          errors.push(
            `Section "${section.name}" is short by ${Math.abs(delta)} period(s): ` +
              `Allocated (${totalAllocated} hrs = ${theoryHours} Th + ${labHours} Lab + ${sectionFixedCount} Fixed) < Capacity (${totalWeeklyCapacity} hrs).`
          );
        }
      }
    }

    for (const [fId, totalAssignedHrs] of facultyWorkloadMap.entries()) {
      const fac = facultyMap.get(fId);
      if (fac && fac.maxWorkloadHours !== undefined && totalAssignedHrs > fac.maxWorkloadHours) {
        errors.push(
          `Faculty "${fac.name}" (${fac.id}) is overloaded: Total Assigned ${totalAssignedHrs} hrs/wk > Max Allowed ${fac.maxWorkloadHours} hrs/wk.`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sectionTallies,
    };
  }

  function generateSchedule({
    sections,
    subjects,
    faculty = [],
    fixedSlots = [],
    scheduleConfig,
    options = {},
  }) {
    const startTime = Date.now();
    const maxRestarts = options.maxRestarts || 150;
    const maxBacktracksPerAttempt = options.maxBacktracksPerAttempt || 3000;
    let seed = options.seed || 1;

    const subjectsMap = new Map(subjects.map((s) => [s.id, s]));
    const facultyMap = new Map(faculty.map((f) => [f.id, f]));

    const preCheck = validatePreFlightTally({ sections, subjects, faculty, fixedSlots, scheduleConfig });
    if (!preCheck.valid) {
      return {
        success: false,
        timetable: createEmptyTimetable(sections, scheduleConfig),
        stats: { executionTimeMs: Date.now() - startTime, attempts: 0, totalSlotsAssigned: 0, softScore: 0 },
        errors: preCheck.errors,
      };
    }

    const externalLoadsMap = new Map();
    for (const fac of faculty) {
      const dayMap = new Map();
      for (const ext of fac.externalLoads || []) {
        if (!dayMap.has(ext.day)) dayMap.set(ext.day, new Map());
        dayMap.get(ext.day).set(ext.period, ext);
      }
      externalLoadsMap.set(fac.id, dayMap);
    }

    for (let attempt = 1; attempt <= maxRestarts; attempt++) {
      seed = (seed * 9301 + 49297) % 233280;
      const timetable = createEmptyTimetable(sections, scheduleConfig);

      // Lock disabled periods
      for (const sec of sections) {
        for (const day of scheduleConfig.days) {
          for (let p = 1; p <= scheduleConfig.periodsPerDay; p++) {
            if (isPeriodDisabled(day, p, scheduleConfig)) {
              timetable[sec.id][day][p] = {
                type: 'DISABLED',
                sectionId: sec.id,
                day,
                period: p,
                isLab: false,
                isLocked: true,
                isDisabled: true,
                label: 'DISABLED / OFF',
                facultyIds: [],
              };
            }
          }
        }
      }

      // Lock fixed slots (both academic and institutional)
      for (const slot of fixedSlots) {
        if (isPeriodDisabled(slot.day, slot.period, scheduleConfig)) continue;
        const targets = slot.sectionId === 'ALL' ? sections : sections.filter((s) => s.id === slot.sectionId);
        const isLabSlot = Boolean(slot.isLab);
        for (const sec of targets) {
          timetable[sec.id][slot.day][slot.period] = {
            type: isLabSlot ? 'LAB' : (slot.subjectId ? 'THEORY' : 'FIXED'),
            sectionId: sec.id,
            day: slot.day,
            period: slot.period,
            subjectId: slot.subjectId,
            label: slot.label,
            facultyIds: slot.facultyIds || (slot.facultyId ? [slot.facultyId] : []),
            isLab: isLabSlot,
            isLocked: true,
            isPrefixed: true,
          };
        }
      }

      // Labs & Theory tasks (excluding already-prefixed hours)
      const labTasks = [];
      const theoryUnits = [];

      for (const sec of sections) {
        for (const alloc of sec.allocations || []) {
          const sub = subjectsMap.get(alloc.subjectId);
          if (!sub) continue;

          // Deduct already prefixed lab hours
          if (sub.isLab || sub.labHours > 0) {
            let prefixedLabHours = 0;
            for (const d of scheduleConfig.days) {
              for (let p = 1; p <= scheduleConfig.periodsPerDay; p++) {
                const cell = timetable[sec.id][d][p];
                if (cell && cell.isPrefixed && cell.isLab && cell.subjectId === sub.id) {
                  prefixedLabHours++;
                }
              }
            }
            const neededLabHours = (sub.labHours || 3) - prefixedLabHours;
            if (neededLabHours > 0) {
              labTasks.push({ sectionId: sec.id, subject: sub, facultyIds: alloc.facultyIds, duration: neededLabHours });
            }
          }

          // Deduct already prefixed theory hours
          if (sub.theoryHours > 0) {
            let prefixedTheoryHours = 0;
            for (const d of scheduleConfig.days) {
              for (let p = 1; p <= scheduleConfig.periodsPerDay; p++) {
                const cell = timetable[sec.id][d][p];
                if (cell && cell.isPrefixed && !cell.isLab && cell.subjectId === sub.id) {
                  prefixedTheoryHours++;
                }
              }
            }
            const neededTheoryHours = sub.theoryHours - prefixedTheoryHours;
            for (let i = 0; i < neededTheoryHours; i++) {
              theoryUnits.push({ sectionId: sec.id, subject: sub, facultyIds: alloc.facultyIds, totalHours: sub.theoryHours });
            }
          }
        }
      }

      for (let i = labTasks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.abs(Math.sin(seed + i)) * (i + 1));
        const temp = labTasks[i];
        labTasks[i] = labTasks[j];
        labTasks[j] = temp;
      }

      let labsPlaced = true;
      for (const lab of labTasks) {
        if (!placeLabBlock(timetable, lab, scheduleConfig, facultyMap, externalLoadsMap)) {
          labsPlaced = false;
          break;
        }
      }
      if (!labsPlaced) continue;

      theoryUnits.sort((a, b) => b.totalHours - a.totalHours || b.facultyIds.length - a.facultyIds.length);

      const searchState = { backtracks: 0, maxBacktracks: maxBacktracksPerAttempt };
      const solved = backtrackTheoryUnits(
        0,
        theoryUnits,
        timetable,
        scheduleConfig,
        facultyMap,
        externalLoadsMap,
        searchState
      );

      if (solved) {
        let assignedCount = 0;
        for (const sec of sections) {
          for (const day of scheduleConfig.days) {
            for (const p of getActivePeriodsForDay(day, scheduleConfig)) {
              if (timetable[sec.id][day][p]) assignedCount++;
            }
          }
        }

        return {
          success: true,
          timetable,
          stats: {
            executionTimeMs: Date.now() - startTime,
            attempts: attempt,
            totalSlotsAssigned: assignedCount,
            softScore: 1000,
          },
        };
      }
    }

    return {
      success: false,
      timetable: createEmptyTimetable(sections, scheduleConfig),
      stats: { executionTimeMs: Date.now() - startTime, attempts: maxRestarts, totalSlotsAssigned: 0, softScore: 0 },
      errors: ['Unable to satisfy all soft spread constraints within restart bounds.'],
    };
  }

  function createEmptyTimetable(sections, scheduleConfig) {
    const grid = {};
    for (const sec of sections) {
      grid[sec.id] = {};
      for (const day of scheduleConfig.days) {
        grid[sec.id][day] = {};
        for (let p = 1; p <= scheduleConfig.periodsPerDay; p++) {
          grid[sec.id][day][p] = null;
        }
      }
    }
    return grid;
  }

  function placeLabBlock(timetable, lab, config, facultyMap, externalLoadsMap) {
    const { sectionId, subject, facultyIds, duration } = lab;
    const candidateStarts = [];

    for (const p of config.morningPeriods) {
      if (p + duration - 1 <= config.lunchBreakAfterPeriod) candidateStarts.push({ session: 'morning', startPeriod: p });
    }
    for (const p of config.afternoonPeriods) {
      candidateStarts.push({ session: 'afternoon', startPeriod: p });
    }

    const validPositions = [];
    for (const day of config.days) {
      const dayAlreadyHasLab = Object.values(timetable[sectionId][day]).some((s) => s && s.isLab);
      if (dayAlreadyHasLab) continue;

      for (const cand of candidateStarts) {
        if (day === 'Saturday' && cand.session === 'afternoon') continue;

        let blockValid = true;
        for (let off = 0; off < duration; off++) {
          const p = cand.startPeriod + off;
          if (isPeriodDisabled(day, p, config)) {
            blockValid = false;
            break;
          }
          if (timetable[sectionId][day][p] !== null) {
            blockValid = false;
            break;
          }
          if (isFacultyClashing(timetable, facultyIds, day, p, sectionId, externalLoadsMap)) {
            blockValid = false;
            break;
          }
        }

        if (blockValid) {
          validPositions.push({ day, startPeriod: cand.startPeriod });
        }
      }
    }

    if (validPositions.length === 0) return false;

    const chosen = validPositions[Math.floor(Math.random() * validPositions.length)];
    for (let off = 0; off < duration; off++) {
      const p = chosen.startPeriod + off;
      timetable[sectionId][chosen.day][p] = {
        type: 'LAB',
        sectionId,
        day: chosen.day,
        period: p,
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        facultyIds,
        facultyNames: facultyIds.map((id) => facultyMap.get(id)?.name || id),
        isLab: true,
        isLocked: false,
        labBlock: { startPeriod: chosen.startPeriod, duration, periodIndex: off + 1 },
      };
    }

    return true;
  }

  function backtrackTheoryUnits(index, units, timetable, config, facultyMap, externalLoadsMap, searchState) {
    if (++searchState.backtracks > searchState.maxBacktracks) return false;
    if (index >= units.length) return true;

    const unit = units[index];
    const { sectionId, subject, facultyIds, totalHours } = unit;
    const candidates = [];

    for (const day of config.days) {
      const activePeriods = getActivePeriodsForDay(day, config);

      let countThisDay = 0;
      for (const p of activePeriods) {
        if (timetable[sectionId][day][p]?.subjectId === subject.id) countThisDay++;
      }
      const maxAllowed = totalHours > config.days.length ? 2 : 1;
      if (countThisDay >= maxAllowed) continue;

      for (const p of activePeriods) {
        if (isPeriodDisabled(day, p, config)) continue;
        if (timetable[sectionId][day][p] !== null) continue;

        if (isFacultyClashing(timetable, facultyIds, day, p, sectionId, externalLoadsMap)) continue;

        const prev = timetable[sectionId][day][p - 1];
        const next = timetable[sectionId][day][p + 1];
        if (prev?.subjectId === subject.id || next?.subjectId === subject.id) continue;
        if (facultyIds.some((f) => prev?.facultyIds.includes(f) || next?.facultyIds.includes(f))) continue;

        let score = 0;
        const isMorning = p <= config.lunchBreakAfterPeriod;

        let mCount = 0;
        let aCount = 0;
        for (const d of config.days) {
          for (const checkP of getActivePeriodsForDay(d, config)) {
            if (timetable[sectionId][d][checkP]?.subjectId === subject.id) {
              if (checkP <= config.lunchBreakAfterPeriod) mCount++;
              else aCount++;
            }
          }
        }
        if (isMorning && mCount <= aCount) score += 20;
        if (!isMorning && aCount < mCount) score += 20;

        for (const d of config.days) {
          if (timetable[sectionId][d][p]?.subjectId === subject.id) score -= 30;
        }

        candidates.push({ day, period: p, score: score + Math.random() * 5 });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    for (const cand of candidates) {
      timetable[sectionId][cand.day][cand.period] = {
        type: 'THEORY',
        sectionId,
        day: cand.day,
        period: cand.period,
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        facultyIds,
        facultyNames: facultyIds.map((id) => facultyMap.get(id)?.name || id),
        isLab: false,
        isLocked: false,
      };

      if (backtrackTheoryUnits(index + 1, units, timetable, config, facultyMap, externalLoadsMap, searchState)) {
        return true;
      }

      timetable[sectionId][cand.day][cand.period] = null;
    }

    return false;
  }

  function isFacultyClashing(timetable, facultyIds, day, period, excludeSectionId, externalLoadsMap) {
    if (!facultyIds || facultyIds.length === 0) return false;

    // Check Other Department Locked Load
    for (const fId of facultyIds) {
      const dayMap = externalLoadsMap.get(fId);
      if (dayMap && dayMap.has(day) && dayMap.get(day).has(period)) {
        return true;
      }
    }

    // Check collision with other sections
    for (const secId of Object.keys(timetable)) {
      if (secId === excludeSectionId) continue;
      const cell = timetable[secId][day]?.[period];
      if (cell && facultyIds.some((fId) => cell.facultyIds.includes(fId))) {
        return true;
      }
    }

    return false;
  }

  function validateSwap(sourceSlot, targetSlot, timetableState, facultyList = [], scheduleConfig) {
    const conflicts = [];

    if (isPeriodDisabled(targetSlot.day, targetSlot.period, scheduleConfig)) {
      conflicts.push(`Rule Violation: ${targetSlot.day} Period ${targetSlot.period} is strictly disabled / unallocatable.`);
    }
    if (isPeriodDisabled(sourceSlot.day, sourceSlot.period, scheduleConfig)) {
      conflicts.push(`Rule Violation: ${sourceSlot.day} Period ${sourceSlot.period} is strictly disabled / unallocatable.`);
    }

    const srcSec = timetableState[sourceSlot.sectionId];
    const tgtSec = timetableState[targetSlot.sectionId];

    if (!srcSec || !tgtSec) {
      return { allowed: false, conflicts: ['Invalid section identifier for swap.'] };
    }

    const srcCell = srcSec[sourceSlot.day]?.[sourceSlot.period];
    const tgtCell = tgtSec[targetSlot.day]?.[targetSlot.period];

    if (srcCell?.isLocked) {
      conflicts.push(`Slot "${srcCell.label || srcCell.subjectName}" at ${sourceSlot.day} Period ${sourceSlot.period} is locked.`);
    }
    if (tgtCell?.isLocked) {
      conflicts.push(`Slot "${tgtCell.label || tgtCell.subjectName}" at ${targetSlot.day} Period ${targetSlot.period} is locked.`);
    }

    const extMap = new Map();
    for (const fac of facultyList) {
      const dayMap = new Map();
      for (const ext of fac.externalLoads || []) {
        if (!dayMap.has(ext.day)) dayMap.set(ext.day, new Map());
        dayMap.get(ext.day).set(ext.period, ext);
      }
      extMap.set(fac.id, dayMap);
    }

    if (srcCell?.facultyIds && srcCell.facultyIds.length > 0) {
      for (const fId of srcCell.facultyIds) {
        const ext = extMap.get(fId)?.get(targetSlot.day)?.get(targetSlot.period);
        if (ext) {
          conflicts.push(
            `External Dept Clash: Faculty "${fId}" is locked in Other Department (${ext.department} Dept: ${ext.subject}) on ${targetSlot.day} Period ${targetSlot.period}.`
          );
        }

        for (const secId of Object.keys(timetableState)) {
          if (secId === sourceSlot.sectionId) continue;
          const other = timetableState[secId][targetSlot.day]?.[targetSlot.period];
          if (other?.facultyIds.includes(fId)) {
            conflicts.push(`Faculty Collision: Teaching staff is already booked in section "${secId}" on ${targetSlot.day} Period ${targetSlot.period}.`);
          }
        }
      }
    }

    if (tgtCell?.facultyIds && tgtCell.facultyIds.length > 0) {
      for (const fId of tgtCell.facultyIds) {
        const ext = extMap.get(fId)?.get(sourceSlot.day)?.get(sourceSlot.period);
        if (ext) {
          conflicts.push(
            `External Dept Clash: Faculty "${fId}" is locked in Other Department (${ext.department} Dept: ${ext.subject}) on ${sourceSlot.day} Period ${sourceSlot.period}.`
          );
        }

        for (const secId of Object.keys(timetableState)) {
          if (secId === targetSlot.sectionId) continue;
          const other = timetableState[secId][sourceSlot.day]?.[sourceSlot.period];
          if (other?.facultyIds.includes(fId)) {
            conflicts.push(`Faculty Collision: Teaching staff is already booked in section "${secId}" on ${sourceSlot.day} Period ${sourceSlot.period}.`);
          }
        }
      }
    }

    if (srcCell?.isLab && sourceSlot.day !== targetSlot.day) {
      conflicts.push(`Lab Integrity: Moving lab "${srcCell.subjectCode}" across days breaks contiguous period block.`);
    }
    if (tgtCell?.isLab && sourceSlot.day !== targetSlot.day) {
      conflicts.push(`Lab Integrity: Moving lab "${tgtCell.subjectCode}" across days breaks contiguous period block.`);
    }

    return { allowed: conflicts.length === 0, conflicts };
  }

  return {
    isPeriodDisabled,
    getActivePeriodsForDay,
    validatePreFlightTally,
    generateSchedule,
    validateSwap,
  };
});
