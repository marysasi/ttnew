/**
 * College Timetable Generator - Pure Constraint Satisfaction Problem (CSP) Solver v3.0
 * Language: TypeScript / Pure ES6+ JavaScript
 *
 * Implements:
 * 1. validatePreFlightTally({ sections, subjects, faculty, fixedSlots, scheduleConfig })
 * 2. generateSchedule({ sections, subjects, faculty, fixedSlots, scheduleConfig })
 * 3. validateSwap(sourceSlot, targetSlot, timetableState, facultyList, scheduleConfig)
 *
 * Core Features:
 * - External / Other Department Locked Load Configuration on Faculty
 * - Strict Disabling / Removal of Saturday Period 5 across all classes & faculty
 * - Tally Engine reconciliation with Saturday Period 5 excluded
 * - Zero faculty collisions at (day, period) respecting other-department commitments
 * - Prefix inviolability, continuous lab blocks (no lunch split), balanced spread, and no consecutive fatigue.
 */

export interface ExternalLoad {
  id: string;
  day: string;       // e.g. 'Tuesday'
  period: number;    // e.g. 2
  department: string;// e.g. 'ECE'
  subject: string;   // e.g. 'Microprocessors'
  hours?: number;    // default 1
}

export interface Faculty {
  id: string;
  name: string;
  department?: string;
  maxWorkloadHours?: number;
  externalLoads?: ExternalLoad[]; // Locked commitments in other departments
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  year?: number;
  department?: string;
  theoryHours: number;
  labHours: number;
  isLab: boolean;
  assignedFacultyIds?: string[];
}

export interface Section {
  id: string;
  name: string;
  year?: number;
  department?: string;
  roomNumber?: string;
  labRoom?: string;
  mentorFacultyId?: string;
  subjectIds?: string[];
  allocations?: Array<{
    subjectId: string;
    facultyIds: string[];
  }>;
}

export interface FixedSlot {
  id?: string;
  sectionId: string; // Specific section ID or 'ALL'
  day: string;       // e.g. 'Monday', 'Saturday'
  period: number;    // 1-based period index
  label: string;     // e.g. 'Unit Test', 'Library', 'Technical Seminar'
  type?: 'NON_ACADEMIC' | 'ACADEMIC';
  subjectId?: string;
  facultyIds?: string[];
  isLab?: boolean;
  isLocked?: boolean;
}

export interface ScheduleConfig {
  days: string[];                        // ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  periodsPerDay: number;                 // 7
  morningPeriods: number[];              // [1, 2, 3, 4]
  afternoonPeriods: number[];            // [5, 6, 7]
  lunchBreakAfterPeriod: number;         // 4
  saturdayDisabledPeriods?: number[];    // [5] -> Strictly disabled
  saturdayMaxPeriods?: number;           // 4 -> Periods 1-4 active
  dayPeriodsOverride?: Record<string, number>;
}

export interface TimetableSlot {
  type: 'THEORY' | 'LAB' | 'FIXED' | 'DISABLED' | 'SELF_STUDY';
  sectionId: string;
  day: string;
  period: number;
  subjectId?: string;
  subjectCode?: string;
  subjectName?: string;
  facultyIds: string[];
  facultyNames?: string[];
  isLab: boolean;
  isLocked: boolean;
  isDisabled?: boolean;
  label?: string;
  labBlock?: {
    startPeriod: number;
    duration: number;
    periodIndex: number;
  };
}

export type TimetableGrid = Record<string, Record<string, Record<number, TimetableSlot | null>>>;

export interface SolverOptions {
  maxRestarts?: number;
  maxBacktracksPerAttempt?: number;
  seed?: number;
}

export interface SolverResult {
  success: boolean;
  timetable: TimetableGrid;
  stats: {
    executionTimeMs: number;
    attempts: number;
    totalSlotsAssigned: number;
    softScore: number;
  };
  errors?: string[];
}

export interface SwapCoord {
  sectionId: string;
  day: string;
  period: number;
}

export interface SwapValidationResult {
  allowed: boolean;
  conflicts: string[];
}

export interface PreFlightResult {
  valid: boolean;
  errors: string[];
  sectionTallies?: Record<string, {
    totalCapacity: number;
    theoryHours: number;
    labHours: number;
    fixedHours: number;
    totalAllocated: number;
    delta: number;
  }>;
}

// ============================================================================
// 1. PRE-FLIGHT VALIDATION TALLY ENGINE
// ============================================================================

/**
 * Checks whether a given period slot is strictly disabled
 * (e.g. Saturday Period 5 is strictly disabled)
 */
export function isPeriodDisabled(day: string, period: number, scheduleConfig: ScheduleConfig): boolean {
  if (day === 'Saturday') {
    const disabled = scheduleConfig.saturdayDisabledPeriods || [5];
    if (disabled.includes(period)) return true;
    const maxP = scheduleConfig.saturdayMaxPeriods || 4;
    if (period > maxP && !disabled.includes(period)) return true;
  }
  return false;
}

/**
 * Get active valid working periods for a day (excluding disabled slots like Saturday P5)
 */
export function getActivePeriodsForDay(day: string, scheduleConfig: ScheduleConfig): number[] {
  const maxP =
    day === 'Saturday'
      ? scheduleConfig.saturdayMaxPeriods || 4
      : scheduleConfig.dayPeriodsOverride?.[day] ?? scheduleConfig.periodsPerDay;

  const disabled = day === 'Saturday' ? scheduleConfig.saturdayDisabledPeriods || [5] : [];
  const list: number[] = [];
  for (let p = 1; p <= maxP; p++) {
    if (!disabled.includes(p)) list.push(p);
  }
  return list;
}

/**
 * Validates that allocated hours for every section match its weekly active capacity exactly,
 * checks faculty workload caps (internal + other-department), and detects slot collisions.
 */
export function validatePreFlightTally({
  sections,
  subjects,
  faculty = [],
  fixedSlots = [],
  scheduleConfig,
}: {
  sections: Section[];
  subjects: Subject[];
  faculty?: Faculty[];
  fixedSlots?: FixedSlot[];
  scheduleConfig: ScheduleConfig;
}): PreFlightResult {
  const errors: string[] = [];
  const subjectsMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));
  const facultyMap = new Map<string, Faculty>(faculty.map((f) => [f.id, f]));
  const sectionTallies: PreFlightResult['sectionTallies'] = {};

  // Total working periods per week excluding Saturday Period 5
  const totalWeeklyCapacity = scheduleConfig.days.reduce(
    (sum, day) => sum + getActivePeriodsForDay(day, scheduleConfig).length,
    0
  );

  // 1. Check fixed slots for out-of-bounds or disabled slots (Saturday P5)
  for (const slot of fixedSlots) {
    if (isPeriodDisabled(slot.day, slot.period, scheduleConfig)) {
      errors.push(
        `Invalid fixed slot "${slot.label}" on ${slot.day} Period ${slot.period}: This period is strictly disabled / unallocatable.`
      );
    }
  }

  // 2. Section capacity reconciliation
  const facultyWorkloadMap = new Map<string, number>();

  // Initialize faculty workload with their other-department locked hours
  for (const fac of faculty) {
    const extHours = (fac.externalLoads || []).reduce((sum, ext) => sum + (ext.hours || 1), 0);
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

  // 3. Faculty Max Workload Limits (Internal + External Other-Dept Loads)
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

// ============================================================================
// 2. CSP SCHEDULER GENERATOR
// ============================================================================

export function generateSchedule({
  sections,
  subjects,
  faculty = [],
  fixedSlots = [],
  scheduleConfig,
  options = {},
}: {
  sections: Section[];
  subjects: Subject[];
  faculty?: Faculty[];
  fixedSlots?: FixedSlot[];
  scheduleConfig: ScheduleConfig;
  options?: SolverOptions;
}): SolverResult {
  const startTime = Date.now();
  const maxRestarts = options.maxRestarts || 150;
  const maxBacktracksPerAttempt = options.maxBacktracksPerAttempt || 3000;
  let seed = options.seed || 1;

  const subjectsMap = new Map(subjects.map((s) => [s.id, s]));
  const facultyMap = new Map(faculty.map((f) => [f.id, f]));

  // Pre-flight tally check
  const preCheck = validatePreFlightTally({ sections, subjects, faculty, fixedSlots, scheduleConfig });
  if (!preCheck.valid) {
    return {
      success: false,
      timetable: createEmptyTimetable(sections, scheduleConfig),
      stats: { executionTimeMs: Date.now() - startTime, attempts: 0, totalSlotsAssigned: 0, softScore: 0 },
      errors: preCheck.errors,
    };
  }

  // Map other-department external locks: extMap[facultyId][day][period] = externalLoad
  const externalLoadsMap = new Map<string, Map<string, Map<number, ExternalLoad>>>();
  for (const fac of faculty) {
    const dayMap = new Map<string, Map<number, ExternalLoad>>();
    for (const ext of fac.externalLoads || []) {
      if (!dayMap.has(ext.day)) dayMap.set(ext.day, new Map<number, ExternalLoad>());
      dayMap.get(ext.day)!.set(ext.period, ext);
    }
    externalLoadsMap.set(fac.id, dayMap);
  }

  for (let attempt = 1; attempt <= maxRestarts; attempt++) {
    seed = (seed * 9301 + 49297) % 233280;

    const timetable = createEmptyTimetable(sections, scheduleConfig);

    // 1. Lock Disabled Periods (Saturday Period 5)
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

    // 2. Lock Fixed Inviolable Slots (both academic and institutional)
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
          facultyIds: slot.facultyIds || [],
          isLab: isLabSlot,
          isLocked: true,
        };
      }
    }

    // 3. Prepare Tasks (deducting already-prefixed hours)
    const labTasks: Array<{ sectionId: string; subject: Subject; facultyIds: string[]; duration: number }> = [];
    const theoryUnits: Array<{ sectionId: string; subject: Subject; facultyIds: string[]; totalHours: number }> = [];

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
              if (cell && cell.isLocked && cell.isLab && cell.subjectId === sub.id) {
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
              if (cell && cell.isLocked && !cell.isLab && cell.subjectId === sub.id) {
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

    // Shuffle labs
    for (let i = labTasks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.abs(Math.sin(seed + i)) * (i + 1));
      [labTasks[i], labTasks[j]] = [labTasks[j], labTasks[i]];
    }

    // 4. Place Continuous Labs (Must not bridge lunch; strictly avoid Saturday P5 and Other-Dept loads)
    let labsPlaced = true;
    for (const lab of labTasks) {
      if (!placeLabBlock(timetable, lab, scheduleConfig, facultyMap, externalLoadsMap)) {
        labsPlaced = false;
        break;
      }
    }
    if (!labsPlaced) continue;

    // 5. MRV Sort on Theory Units
    theoryUnits.sort((a, b) => b.totalHours - a.totalHours || b.facultyIds.length - a.facultyIds.length);

    // 6. Backtrack Theory Units
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

function createEmptyTimetable(sections: Section[], scheduleConfig: ScheduleConfig): TimetableGrid {
  const grid: TimetableGrid = {};
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

function placeLabBlock(
  timetable: TimetableGrid,
  lab: { sectionId: string; subject: Subject; facultyIds: string[]; duration: number },
  config: ScheduleConfig,
  facultyMap: Map<string, Faculty>,
  externalLoadsMap: Map<string, Map<string, Map<number, ExternalLoad>>>
): boolean {
  const { sectionId, subject, facultyIds, duration } = lab;
  const candidateStarts: Array<{ session: 'morning' | 'afternoon'; startPeriod: number }> = [];

  for (const p of config.morningPeriods) {
    if (p + duration - 1 <= config.lunchBreakAfterPeriod) {
      candidateStarts.push({ session: 'morning', startPeriod: p });
    }
  }
  for (const p of config.afternoonPeriods) {
    candidateStarts.push({ session: 'afternoon', startPeriod: p });
  }

  const validPositions: Array<{ day: string; startPeriod: number }> = [];

  for (const day of config.days) {
    // On Saturday, only morning session is active; skip afternoon lab attempts on Saturday
    if (day === 'Saturday' && candidateStarts.some((c) => c.session === 'afternoon')) {
      // evaluate only morning
    }

    const dayAlreadyHasLab = Object.values(timetable[sectionId][day]).some((s) => s?.isLab);
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

function backtrackTheoryUnits(
  index: number,
  units: Array<{ sectionId: string; subject: Subject; facultyIds: string[]; totalHours: number }>,
  timetable: TimetableGrid,
  config: ScheduleConfig,
  facultyMap: Map<string, Faculty>,
  externalLoadsMap: Map<string, Map<string, Map<number, ExternalLoad>>>,
  searchState: { backtracks: number; maxBacktracks: number }
): boolean {
  if (++searchState.backtracks > searchState.maxBacktracks) return false;
  if (index >= units.length) return true;

  const unit = units[index];
  const { sectionId, subject, facultyIds, totalHours } = unit;
  const candidates: Array<{ day: string; period: number; score: number }> = [];

  for (const day of config.days) {
    const activePeriods = getActivePeriodsForDay(day, config);

    // Spread constraint: 1 hr/day on distinct days
    let countThisDay = 0;
    for (const p of activePeriods) {
      if (timetable[sectionId][day][p]?.subjectId === subject.id) countThisDay++;
    }
    const maxAllowed = totalHours > config.days.length ? 2 : 1;
    if (countThisDay >= maxAllowed) continue;

    for (const p of activePeriods) {
      if (isPeriodDisabled(day, p, config)) continue;
      if (timetable[sectionId][day][p] !== null) continue;

      // Check collision with other sections AND Other Department Locked Load
      if (isFacultyClashing(timetable, facultyIds, day, p, sectionId, externalLoadsMap)) continue;

      // Avoid consecutive periods for same course or faculty
      const prev = timetable[sectionId][day][p - 1];
      const next = timetable[sectionId][day][p + 1];
      if (prev?.subjectId === subject.id || next?.subjectId === subject.id) continue;
      if (facultyIds.some((f) => prev?.facultyIds.includes(f) || next?.facultyIds.includes(f))) continue;

      // Heuristic scoring: Session distribution & staggering
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

    if (
      backtrackTheoryUnits(
        index + 1,
        units,
        timetable,
        config,
        facultyMap,
        externalLoadsMap,
        searchState
      )
    ) {
      return true;
    }

    timetable[sectionId][cand.day][cand.period] = null;
  }

  return false;
}

function isFacultyClashing(
  timetable: TimetableGrid,
  facultyIds: string[],
  day: string,
  period: number,
  excludeSectionId: string,
  externalLoadsMap: Map<string, Map<string, Map<number, ExternalLoad>>>
): boolean {
  if (!facultyIds || facultyIds.length === 0) return false;

  // 1. Check Other Department Locked Load
  for (const fId of facultyIds) {
    const dayMap = externalLoadsMap.get(fId);
    if (dayMap && dayMap.has(day) && dayMap.get(day)!.has(period)) {
      return true; // Barrier: locked in other department!
    }
  }

  // 2. Check collision with other sections
  for (const secId of Object.keys(timetable)) {
    if (secId === excludeSectionId) continue;
    const cell = timetable[secId][day]?.[period];
    if (cell && facultyIds.some((fId) => cell.facultyIds.includes(fId))) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// 3. DRAG-AND-SWAP CONFLICT VALIDATOR
// ============================================================================

export function validateSwap(
  sourceSlot: SwapCoord,
  targetSlot: SwapCoord,
  timetableState: TimetableGrid,
  facultyList: Faculty[] = [],
  scheduleConfig: ScheduleConfig
): SwapValidationResult {
  const conflicts: string[] = [];

  // 1. Strictly block moves into or out of Saturday Period 5 (Disabled Period)
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

  // 2. Inviolable fixed slots
  if (srcCell?.isLocked) {
    conflicts.push(`Slot "${srcCell.label || srcCell.subjectName}" at ${sourceSlot.day} Period ${sourceSlot.period} is locked.`);
  }
  if (tgtCell?.isLocked) {
    conflicts.push(`Slot "${tgtCell.label || tgtCell.subjectName}" at ${targetSlot.day} Period ${targetSlot.period} is locked.`);
  }

  // Rapid external load lookup
  const extMap = new Map<string, Map<string, Map<number, ExternalLoad>>>();
  for (const fac of facultyList) {
    const dayMap = new Map<string, Map<number, ExternalLoad>>();
    for (const ext of fac.externalLoads || []) {
      if (!dayMap.has(ext.day)) dayMap.set(ext.day, new Map<number, ExternalLoad>());
      dayMap.get(ext.day)!.set(ext.period, ext);
    }
    extMap.set(fac.id, dayMap);
  }

  // 3. Check faculty collisions including Other-Department Locked Load
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

  // 4. Contiguous Lab integrity
  if (srcCell?.isLab && sourceSlot.day !== targetSlot.day) {
    conflicts.push(`Lab Integrity: Moving lab "${srcCell.subjectCode}" across days breaks contiguous period block.`);
  }
  if (tgtCell?.isLab && sourceSlot.day !== targetSlot.day) {
    conflicts.push(`Lab Integrity: Moving lab "${tgtCell.subjectCode}" across days breaks contiguous period block.`);
  }

  return { allowed: conflicts.length === 0, conflicts };
}

export default {
  isPeriodDisabled,
  getActivePeriodsForDay,
  validatePreFlightTally,
  generateSchedule,
  validateSwap,
};
