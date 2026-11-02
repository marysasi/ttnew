/**
 * College Timetable Generator - Core Engine v3.0
 * Comprehensive CSP / Backtracking Algorithm, Other-Department Faculty Locking,
 * Saturday Period 5 Disabling, Pre-Flight Tally Reconciliation, and Real-Time Conflict Detection.
 */

(function (window) {
  'use strict';

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Schedule Configuration
  // -------------------------------------------------------------
  const DEFAULT_SCHEDULE_CONFIG = {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    periods: [
      { id: 1, name: 'Period 1', time: '09:00 - 09:50', session: 'morning' },
      { id: 2, name: 'Period 2', time: '09:50 - 10:40', session: 'morning' },
      { id: 3, name: 'Period 3', time: '10:55 - 11:45', session: 'morning' },
      { id: 4, name: 'Period 4', time: '11:45 - 12:35', session: 'morning' },
      { id: 5, name: 'Period 5', time: '01:30 - 02:20', session: 'afternoon' },
      { id: 6, name: 'Period 6', time: '02:20 - 03:10', session: 'afternoon' },
      { id: 7, name: 'Period 7', time: '03:10 - 04:00', session: 'afternoon' },
    ],
    lunchBreak: {
      afterPeriod: 4,
      name: 'Lunch Break',
      time: '12:35 - 01:30',
    },
    // Saturday Rule: Strictly 4 Hours Only (Periods 1 to 4 active, Periods 5, 6, 7 inactive / closed)
    // Total weekly working periods per class = (5 * 7) + (1 * 4) = 39 Periods/Week
    saturdayDisabledPeriods: [5, 6, 7],
    saturdayMaxPeriods: 4,
  };

  // -------------------------------------------------------------
  // Realistic Demo College Dataset (Engineering College - CSE Dept)
  // With External / Other Department Locked Load Configuration
  // -------------------------------------------------------------
  const DEFAULT_FACULTY = [
    {
      id: 'fac-1',
      empId: 'EMP101',
      name: 'Dr. Ramesh Kumar',
      department: 'CSE',
      designation: 'Professor & HOD',
      email: 'ramesh.hod@college.edu',
      maxWorkloadHours: 16,
      color: '#4338ca',
      externalLoads: [],
    },
    {
      id: 'fac-2',
      empId: 'EMP102',
      name: 'Dr. Priya Sharma',
      department: 'CSE',
      designation: 'Associate Professor',
      email: 'priya.s@college.edu',
      maxWorkloadHours: 18,
      color: '#0d9488',
      // Locked commitments in other departments:
      externalLoads: [
        { id: 'ext-1', day: 'Tuesday', period: 2, department: 'ECE', subject: 'Microprocessors & Microcontrollers', hours: 1 },
        { id: 'ext-2', day: 'Thursday', period: 4, department: 'ECE', subject: 'Embedded Systems Design', hours: 1 },
      ],
    },
    {
      id: 'fac-3',
      empId: 'EMP103',
      name: 'Prof. Suresh Nair',
      department: 'CSE',
      designation: 'Associate Professor',
      email: 'suresh.n@college.edu',
      maxWorkloadHours: 18,
      color: '#b45309',
      externalLoads: [
        { id: 'ext-3', day: 'Wednesday', period: 3, department: 'IT', subject: 'Data Communications', hours: 1 },
      ],
    },
    {
      id: 'fac-4',
      empId: 'EMP104',
      name: 'Mrs. Ananya Sen',
      department: 'CSE',
      designation: 'Assistant Professor',
      email: 'ananya.sen@college.edu',
      maxWorkloadHours: 20,
      color: '#be185d',
      externalLoads: [],
    },
    {
      id: 'fac-5',
      empId: 'EMP105',
      name: 'Mr. Vikram Verma',
      department: 'CSE',
      designation: 'Assistant Professor',
      email: 'vikram.v@college.edu',
      maxWorkloadHours: 20,
      color: '#0369a1',
      externalLoads: [
        { id: 'ext-4', day: 'Monday', period: 6, department: 'MECH', subject: 'Python for Mechanical Engineers', hours: 1 },
      ],
    },
    {
      id: 'fac-6',
      empId: 'EMP106',
      name: 'Dr. Kavita Reddy',
      department: 'CSE',
      designation: 'Associate Professor',
      email: 'kavita.r@college.edu',
      maxWorkloadHours: 18,
      color: '#15803d',
      externalLoads: [],
    },
    {
      id: 'fac-7',
      empId: 'EMP107',
      name: 'Mr. Arvind Joshi',
      department: 'IT',
      designation: 'Assistant Professor',
      email: 'arvind.j@college.edu',
      maxWorkloadHours: 20,
      color: '#6d28d9',
      externalLoads: [
        { id: 'ext-5', day: 'Friday', period: 3, department: 'AIDS', subject: 'Cloud Foundations', hours: 1 },
      ],
    },
    {
      id: 'fac-8',
      empId: 'EMP108',
      name: 'Mrs. Deepa Malik',
      department: 'IT',
      designation: 'Assistant Professor',
      email: 'deepa.m@college.edu',
      maxWorkloadHours: 20,
      color: '#c2410c',
      externalLoads: [],
    },
    {
      id: 'fac-9',
      empId: 'EMP109',
      name: 'Dr. Rajesh Patel',
      department: 'ECE',
      designation: 'Associate Professor',
      email: 'rajesh.p@college.edu',
      maxWorkloadHours: 18,
      color: '#475569',
      externalLoads: [
        { id: 'ext-6', day: 'Monday', period: 2, department: 'ECE', subject: 'VLSI Design', hours: 1 },
        { id: 'ext-7', day: 'Thursday', period: 3, department: 'ECE', subject: 'Digital Electronics', hours: 1 },
      ],
    },
    {
      id: 'fac-10',
      empId: 'EMP110',
      name: 'Ms. Meera Iyer',
      department: 'S&H',
      designation: 'Assistant Professor (Maths)',
      email: 'meera.i@college.edu',
      maxWorkloadHours: 20,
      color: '#047857',
      externalLoads: [
        { id: 'ext-8', day: 'Wednesday', period: 2, department: 'CIVIL', subject: 'Transforms & Numerical Methods', hours: 1 },
      ],
    },
    {
      id: 'fac-11',
      empId: 'EMP111',
      name: 'Dr. Sandeep Rao',
      department: 'S&H',
      designation: 'Professor (Physics)',
      email: 'sandeep.r@college.edu',
      maxWorkloadHours: 16,
      color: '#7c2d12',
      externalLoads: [],
    },
    {
      id: 'fac-12',
      empId: 'EMP112',
      name: 'Mr. Karthik Menon',
      department: 'CSE',
      designation: 'Assistant Professor',
      email: 'karthik.m@college.edu',
      maxWorkloadHours: 20,
      color: '#0e7490',
      externalLoads: [],
    },
    {
      id: 'fac-13',
      empId: 'EMP113',
      name: 'Dr. Lakshmi Narayanan',
      department: 'MECH',
      designation: 'Associate Professor',
      email: 'lakshmi.n@college.edu',
      maxWorkloadHours: 18,
      color: '#0284c7',
      externalLoads: [],
    },
    {
      id: 'fac-14',
      empId: 'EMP114',
      name: 'Prof. Robert Wilson',
      department: 'S&H',
      designation: 'Assistant Professor (English)',
      email: 'robert.w@college.edu',
      maxWorkloadHours: 18,
      color: '#4f46e5',
      externalLoads: [],
    },
  ];

  const DEFAULT_SUBJECTS = [
    // -------------------------------------------------------------
    // 1st Year Subjects (Semester 1 & 2) - Total: 30 Theory + 9 Lab = 39 Hours
    // -------------------------------------------------------------
    { id: 'sub-101', code: 'MA101', name: 'Engineering Mathematics I', year: 1, department: 'S&H', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#10b981' },
    { id: 'sub-102', code: 'PH101', name: 'Engineering Physics', year: 1, department: 'S&H', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#6366f1' },
    { id: 'sub-103', code: 'CS101', name: 'Programming in C', year: 1, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#f59e0b' },
    { id: 'sub-104', code: 'EE101', name: 'Basic Electrical & Electronics', year: 1, department: 'ECE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#8b5cf6' },
    { id: 'sub-105', code: 'HS101', name: 'Technical English & Communication', year: 1, department: 'S&H', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#059669' },
    { id: 'sub-106', code: 'ME101', name: 'Engineering Graphics & Design', year: 1, department: 'MECH', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#d97706' },
    { id: 'sub-107L', code: 'CS102L', name: 'Programming in C Lab', year: 1, department: 'CSE', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#ec4899' },
    { id: 'sub-108L', code: 'PH102L', name: 'Physics Laboratory', year: 1, department: 'S&H', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#06b6d4' },
    { id: 'sub-109L', code: 'ME102L', name: 'Workshop & Prototyping Lab', year: 1, department: 'MECH', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#f43f5e' },

    // -------------------------------------------------------------
    // 2nd Year Subjects (Semester 3 & 4) - Total: 30 Theory + 9 Lab = 39 Hours
    // -------------------------------------------------------------
    { id: 'sub-201', code: 'CS201', name: 'Data Structures & Algorithms', year: 2, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#3b82f6' },
    { id: 'sub-202', code: 'CS202', name: 'Object Oriented Programming (Java)', year: 2, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#f97316' },
    { id: 'sub-203', code: 'CS203', name: 'Discrete Mathematical Structures', year: 2, department: 'S&H', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#14b8a6' },
    { id: 'sub-204', code: 'CS204', name: 'Computer Organization & Arch.', year: 2, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#84cc16' },
    { id: 'sub-205', code: 'CS205', name: 'Design & Analysis of Algorithms', year: 2, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#a855f7' },
    { id: 'sub-206', code: 'CS206', name: 'Digital Principles & System Design', year: 2, department: 'ECE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#eab308' },
    { id: 'sub-207L', code: 'CS207L', name: 'Data Structures Lab', year: 2, department: 'CSE', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#06b6d4' },
    { id: 'sub-208L', code: 'CS208L', name: 'Java Programming Lab', year: 2, department: 'CSE', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#e11d48' },
    { id: 'sub-209L', code: 'CS209L', name: 'Digital Systems & Hardware Lab', year: 2, department: 'ECE', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#8b5cf6' },

    // -------------------------------------------------------------
    // 3rd Year Subjects (Semester 5 & 6) - Total: 30 Theory + 9 Lab = 39 Hours
    // -------------------------------------------------------------
    { id: 'sub-301', code: 'CS301', name: 'Database Management Systems', year: 3, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#6366f1' },
    { id: 'sub-302', code: 'CS302', name: 'Operating Systems', year: 3, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#a855f7' },
    { id: 'sub-303', code: 'CS303', name: 'Computer Networks', year: 3, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#22c55e' },
    { id: 'sub-304', code: 'CS304', name: 'Software Engineering & Agile', year: 3, department: 'IT', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#eab308' },
    { id: 'sub-305', code: 'CS305', name: 'Theory of Computation & Automata', year: 3, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#0ea5e9' },
    { id: 'sub-306', code: 'CS306', name: 'Microprocessors & Microcontrollers', year: 3, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#f59e0b' },
    { id: 'sub-307L', code: 'CS307L', name: 'DBMS & SQL Laboratory', year: 3, department: 'CSE', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#d946ef' },
    { id: 'sub-308L', code: 'CS308L', name: 'Operating Systems & Networks Lab', year: 3, department: 'CSE', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#0284c7' },
    { id: 'sub-309L', code: 'CS309L', name: 'Microprocessors & Assembly Lab', year: 3, department: 'CSE', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#ec4899' },

    // -------------------------------------------------------------
    // 4th Year Subjects (Semester 7 & 8) - Total: 30 Theory + 9 Lab = 39 Hours
    // -------------------------------------------------------------
    { id: 'sub-401', code: 'CS401', name: 'Artificial Intelligence & ML', year: 4, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#ef4444' },
    { id: 'sub-402', code: 'CS402', name: 'Cloud Computing & DevOps', year: 4, department: 'IT', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#0284c7' },
    { id: 'sub-403', code: 'CS403', name: 'Cyber Security & Cryptography', year: 4, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#16a34a' },
    { id: 'sub-404', code: 'CS404', name: 'Distributed Systems & Blockchain', year: 4, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#8b5cf6' },
    { id: 'sub-405', code: 'CS405', name: 'Big Data Analytics & Mining', year: 4, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#f97316' },
    { id: 'sub-406', code: 'CS406', name: 'Internet of Things (IoT) & Embedded', year: 4, department: 'CSE', theoryHoursPerWeek: 5, labHoursPerWeek: 0, isLab: false, color: '#14b8a6' },
    { id: 'sub-407L', code: 'CS407L', name: 'AI & Deep Learning Laboratory', year: 4, department: 'CSE', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#9333ea' },
    { id: 'sub-408L', code: 'CS408L', name: 'Cloud, Security & DevOps Lab', year: 4, department: 'IT', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#06b6d4' },
    { id: 'sub-409P', code: 'CS409P', name: 'Major Capstone Phase I Project', year: 4, department: 'CSE', theoryHoursPerWeek: 0, labHoursPerWeek: 3, isLab: true, color: '#f43f5e' },
  ];

  const DEFAULT_SECTIONS = [
    { id: 'sec-1a', year: 1, name: 'Section A', department: 'CSE', roomNumber: 'LH-101', labRoom: 'Computing Lab 1', mentorFacultyId: 'fac-10' },
    { id: 'sec-1b', year: 1, name: 'Section B', department: 'CSE', roomNumber: 'LH-102', labRoom: 'Computing Lab 1', mentorFacultyId: 'fac-11' },
    { id: 'sec-2a', year: 2, name: 'Section A', department: 'CSE', roomNumber: 'LH-201', labRoom: 'Software Lab A', mentorFacultyId: 'fac-2' },
    { id: 'sec-2b', year: 2, name: 'Section B', department: 'CSE', roomNumber: 'LH-202', labRoom: 'Software Lab B', mentorFacultyId: 'fac-3' },
    { id: 'sec-3a', year: 3, name: 'Section A', department: 'CSE', roomNumber: 'LH-301', labRoom: 'Advanced Systems Lab', mentorFacultyId: 'fac-4' },
    { id: 'sec-4a', year: 4, name: 'Section A', department: 'CSE', roomNumber: 'LH-401', labRoom: 'AI Research Lab', mentorFacultyId: 'fac-1' },
  ];

  const DEFAULT_ALLOCATIONS = [
    // Year 1 Sec A
    { sectionId: 'sec-1a', subjectId: 'sub-101', facultyIds: ['fac-10'] },
    { sectionId: 'sec-1a', subjectId: 'sub-102', facultyIds: ['fac-11'] },
    { sectionId: 'sec-1a', subjectId: 'sub-103', facultyIds: ['fac-5'] },
    { sectionId: 'sec-1a', subjectId: 'sub-104', facultyIds: ['fac-9'] },
    { sectionId: 'sec-1a', subjectId: 'sub-105', facultyIds: ['fac-14'] },
    { sectionId: 'sec-1a', subjectId: 'sub-106', facultyIds: ['fac-13'] },
    { sectionId: 'sec-1a', subjectId: 'sub-107L', facultyIds: ['fac-5', 'fac-12'] },
    { sectionId: 'sec-1a', subjectId: 'sub-108L', facultyIds: ['fac-11'] },
    { sectionId: 'sec-1a', subjectId: 'sub-109L', facultyIds: ['fac-13'] },

    // Year 1 Sec B
    { sectionId: 'sec-1b', subjectId: 'sub-101', facultyIds: ['fac-10'] },
    { sectionId: 'sec-1b', subjectId: 'sub-102', facultyIds: ['fac-11'] },
    { sectionId: 'sec-1b', subjectId: 'sub-103', facultyIds: ['fac-12'] },
    { sectionId: 'sec-1b', subjectId: 'sub-104', facultyIds: ['fac-9'] },
    { sectionId: 'sec-1b', subjectId: 'sub-105', facultyIds: ['fac-14'] },
    { sectionId: 'sec-1b', subjectId: 'sub-106', facultyIds: ['fac-13'] },
    { sectionId: 'sec-1b', subjectId: 'sub-107L', facultyIds: ['fac-12', 'fac-5'] },
    { sectionId: 'sec-1b', subjectId: 'sub-108L', facultyIds: ['fac-11'] },
    { sectionId: 'sec-1b', subjectId: 'sub-109L', facultyIds: ['fac-13'] },

    // Year 2 Sec A
    { sectionId: 'sec-2a', subjectId: 'sub-201', facultyIds: ['fac-2'] },
    { sectionId: 'sec-2a', subjectId: 'sub-202', facultyIds: ['fac-4'] },
    { sectionId: 'sec-2a', subjectId: 'sub-203', facultyIds: ['fac-10'] },
    { sectionId: 'sec-2a', subjectId: 'sub-204', facultyIds: ['fac-6'] },
    { sectionId: 'sec-2a', subjectId: 'sub-205', facultyIds: ['fac-12'] },
    { sectionId: 'sec-2a', subjectId: 'sub-206', facultyIds: ['fac-9'] },
    { sectionId: 'sec-2a', subjectId: 'sub-207L', facultyIds: ['fac-2', 'fac-4'] },
    { sectionId: 'sec-2a', subjectId: 'sub-208L', facultyIds: ['fac-4', 'fac-5'] },
    { sectionId: 'sec-2a', subjectId: 'sub-209L', facultyIds: ['fac-9'] },

    // Year 2 Sec B
    { sectionId: 'sec-2b', subjectId: 'sub-201', facultyIds: ['fac-3'] },
    { sectionId: 'sec-2b', subjectId: 'sub-202', facultyIds: ['fac-5'] },
    { sectionId: 'sec-2b', subjectId: 'sub-203', facultyIds: ['fac-10'] },
    { sectionId: 'sec-2b', subjectId: 'sub-204', facultyIds: ['fac-6'] },
    { sectionId: 'sec-2b', subjectId: 'sub-205', facultyIds: ['fac-12'] },
    { sectionId: 'sec-2b', subjectId: 'sub-206', facultyIds: ['fac-9'] },
    { sectionId: 'sec-2b', subjectId: 'sub-207L', facultyIds: ['fac-3', 'fac-12'] },
    { sectionId: 'sec-2b', subjectId: 'sub-208L', facultyIds: ['fac-5', 'fac-4'] },
    { sectionId: 'sec-2b', subjectId: 'sub-209L', facultyIds: ['fac-9'] },

    // Year 3 Sec A
    { sectionId: 'sec-3a', subjectId: 'sub-301', facultyIds: ['fac-6'] },
    { sectionId: 'sec-3a', subjectId: 'sub-302', facultyIds: ['fac-2'] },
    { sectionId: 'sec-3a', subjectId: 'sub-303', facultyIds: ['fac-3'] },
    { sectionId: 'sec-3a', subjectId: 'sub-304', facultyIds: ['fac-7'] },
    { sectionId: 'sec-3a', subjectId: 'sub-305', facultyIds: ['fac-1'] },
    { sectionId: 'sec-3a', subjectId: 'sub-306', facultyIds: ['fac-8'] },
    { sectionId: 'sec-3a', subjectId: 'sub-307L', facultyIds: ['fac-6', 'fac-7'] },
    { sectionId: 'sec-3a', subjectId: 'sub-308L', facultyIds: ['fac-2', 'fac-3'] },
    { sectionId: 'sec-3a', subjectId: 'sub-309L', facultyIds: ['fac-8'] },

    // Year 4 Sec A
    { sectionId: 'sec-4a', subjectId: 'sub-401', facultyIds: ['fac-1'] },
    { sectionId: 'sec-4a', subjectId: 'sub-402', facultyIds: ['fac-7'] },
    { sectionId: 'sec-4a', subjectId: 'sub-403', facultyIds: ['fac-8'] },
    { sectionId: 'sec-4a', subjectId: 'sub-404', facultyIds: ['fac-4'] },
    { sectionId: 'sec-4a', subjectId: 'sub-405', facultyIds: ['fac-3'] },
    { sectionId: 'sec-4a', subjectId: 'sub-406', facultyIds: ['fac-12'] },
    { sectionId: 'sec-4a', subjectId: 'sub-407L', facultyIds: ['fac-1', 'fac-8'] },
    { sectionId: 'sec-4a', subjectId: 'sub-408L', facultyIds: ['fac-7'] },
    { sectionId: 'sec-4a', subjectId: 'sub-409P', facultyIds: ['fac-1', 'fac-2'] },
  ];

  // -------------------------------------------------------------
  // Pure Academic Prefixed Slots (Core Theory & Continuous Labs Only)
  // No non-academic, no tests, no library hours
  // -------------------------------------------------------------
  const DEFAULT_PREFIXED_SLOTS = [
    // Year 2 Sec A:
    // 1. Data Structures Lab (CS207L - 3 continuous periods): Monday Periods 1, 2, 3
    { id: 'pre-lab-2a-1', sectionId: 'sec-2a', day: 'Monday', periodNumber: 1, type: 'ACADEMIC', isLab: true, subjectId: 'sub-207L', label: 'CS207L Lab', facultyIds: ['fac-2', 'fac-4'], isLocked: true },
    { id: 'pre-lab-2a-2', sectionId: 'sec-2a', day: 'Monday', periodNumber: 2, type: 'ACADEMIC', isLab: true, subjectId: 'sub-207L', label: 'CS207L Lab', facultyIds: ['fac-2', 'fac-4'], isLocked: true },
    { id: 'pre-lab-2a-3', sectionId: 'sec-2a', day: 'Monday', periodNumber: 3, type: 'ACADEMIC', isLab: true, subjectId: 'sub-207L', label: 'CS207L Lab', facultyIds: ['fac-2', 'fac-4'], isLocked: true },
    // 2. Java Programming Lab (CS208L - 3 continuous periods): Thursday Periods 5, 6, 7
    { id: 'pre-lab-2a-4', sectionId: 'sec-2a', day: 'Thursday', periodNumber: 5, type: 'ACADEMIC', isLab: true, subjectId: 'sub-208L', label: 'CS208L Lab', facultyIds: ['fac-4', 'fac-5'], isLocked: true },
    { id: 'pre-lab-2a-5', sectionId: 'sec-2a', day: 'Thursday', periodNumber: 6, type: 'ACADEMIC', isLab: true, subjectId: 'sub-208L', label: 'CS208L Lab', facultyIds: ['fac-4', 'fac-5'], isLocked: true },
    { id: 'pre-lab-2a-6', sectionId: 'sec-2a', day: 'Thursday', periodNumber: 7, type: 'ACADEMIC', isLab: true, subjectId: 'sub-208L', label: 'CS208L Lab', facultyIds: ['fac-4', 'fac-5'], isLocked: true },
    // 3. Prefixed Theory: CS201 Data Structures (1 hr): Wednesday Period 1
    { id: 'pre-th-2a-1', sectionId: 'sec-2a', day: 'Wednesday', periodNumber: 1, type: 'ACADEMIC', isLab: false, subjectId: 'sub-201', label: 'CS201 Data Structures', facultyIds: ['fac-2'], isLocked: true },
    // 4. Prefixed Theory: CS202 OOP Java (1 hr): Friday Period 4
    { id: 'pre-th-2a-2', sectionId: 'sec-2a', day: 'Friday', periodNumber: 4, type: 'ACADEMIC', isLab: false, subjectId: 'sub-202', label: 'CS202 Java OOP', facultyIds: ['fac-4'], isLocked: true },

    // Year 1 Sec A:
    // 1. Programming in C Lab (CS107L - 3 continuous periods): Tuesday Periods 1, 2, 3
    { id: 'pre-lab-1a-1', sectionId: 'sec-1a', day: 'Tuesday', periodNumber: 1, type: 'ACADEMIC', isLab: true, subjectId: 'sub-107L', label: 'CS102L Lab', facultyIds: ['fac-5', 'fac-12'], isLocked: true },
    { id: 'pre-lab-1a-2', sectionId: 'sec-1a', day: 'Tuesday', periodNumber: 2, type: 'ACADEMIC', isLab: true, subjectId: 'sub-107L', label: 'CS102L Lab', facultyIds: ['fac-5', 'fac-12'], isLocked: true },
    { id: 'pre-lab-1a-3', sectionId: 'sec-1a', day: 'Tuesday', periodNumber: 3, type: 'ACADEMIC', isLab: true, subjectId: 'sub-107L', label: 'CS102L Lab', facultyIds: ['fac-5', 'fac-12'], isLocked: true },
    // 2. Physics Laboratory (PH108L - 3 continuous periods): Thursday Periods 1, 2, 3
    { id: 'pre-lab-1a-4', sectionId: 'sec-1a', day: 'Thursday', periodNumber: 1, type: 'ACADEMIC', isLab: true, subjectId: 'sub-108L', label: 'PH102L Lab', facultyIds: ['fac-11'], isLocked: true },
    { id: 'pre-lab-1a-5', sectionId: 'sec-1a', day: 'Thursday', periodNumber: 2, type: 'ACADEMIC', isLab: true, subjectId: 'sub-108L', label: 'PH102L Lab', facultyIds: ['fac-11'], isLocked: true },
    { id: 'pre-lab-1a-6', sectionId: 'sec-1a', day: 'Thursday', periodNumber: 3, type: 'ACADEMIC', isLab: true, subjectId: 'sub-108L', label: 'PH102L Lab', facultyIds: ['fac-11'], isLocked: true },
    // 3. Prefixed Theory: CS101 Programming in C (1 hr): Monday Period 1
    { id: 'pre-th-1a-1', sectionId: 'sec-1a', day: 'Monday', periodNumber: 1, type: 'ACADEMIC', isLab: false, subjectId: 'sub-103', label: 'CS101 Programming in C', facultyIds: ['fac-5'], isLocked: true },

    // Year 1 Sec B:
    // 1. Programming in C Lab (CS107L - 3 continuous periods): Wednesday Periods 1, 2, 3
    { id: 'pre-lab-1b-1', sectionId: 'sec-1b', day: 'Wednesday', periodNumber: 1, type: 'ACADEMIC', isLab: true, subjectId: 'sub-107L', label: 'CS102L Lab', facultyIds: ['fac-12', 'fac-5'], isLocked: true },
    { id: 'pre-lab-1b-2', sectionId: 'sec-1b', day: 'Wednesday', periodNumber: 2, type: 'ACADEMIC', isLab: true, subjectId: 'sub-107L', label: 'CS102L Lab', facultyIds: ['fac-12', 'fac-5'], isLocked: true },
    { id: 'pre-lab-1b-3', sectionId: 'sec-1b', day: 'Wednesday', periodNumber: 3, type: 'ACADEMIC', isLab: true, subjectId: 'sub-107L', label: 'CS102L Lab', facultyIds: ['fac-12', 'fac-5'], isLocked: true },
    // 2. Physics Laboratory (PH108L - 3 continuous periods): Friday Periods 1, 2, 3
    { id: 'pre-lab-1b-4', sectionId: 'sec-1b', day: 'Friday', periodNumber: 1, type: 'ACADEMIC', isLab: true, subjectId: 'sub-108L', label: 'PH102L Lab', facultyIds: ['fac-11'], isLocked: true },
    { id: 'pre-lab-1b-5', sectionId: 'sec-1b', day: 'Friday', periodNumber: 2, type: 'ACADEMIC', isLab: true, subjectId: 'sub-108L', label: 'PH102L Lab', facultyIds: ['fac-11'], isLocked: true },
    { id: 'pre-lab-1b-6', sectionId: 'sec-1b', day: 'Friday', periodNumber: 3, type: 'ACADEMIC', isLab: true, subjectId: 'sub-108L', label: 'PH102L Lab', facultyIds: ['fac-11'], isLocked: true },

    // Year 2 Sec B:
    // 1. Data Structures Lab (CS207L - 3 continuous periods): Tuesday Periods 5, 6, 7
    { id: 'pre-lab-2b-1', sectionId: 'sec-2b', day: 'Tuesday', periodNumber: 5, type: 'ACADEMIC', isLab: true, subjectId: 'sub-207L', label: 'CS207L Lab', facultyIds: ['fac-3', 'fac-12'], isLocked: true },
    { id: 'pre-lab-2b-2', sectionId: 'sec-2b', day: 'Tuesday', periodNumber: 6, type: 'ACADEMIC', isLab: true, subjectId: 'sub-207L', label: 'CS207L Lab', facultyIds: ['fac-3', 'fac-12'], isLocked: true },
    { id: 'pre-lab-2b-3', sectionId: 'sec-2b', day: 'Tuesday', periodNumber: 7, type: 'ACADEMIC', isLab: true, subjectId: 'sub-207L', label: 'CS207L Lab', facultyIds: ['fac-3', 'fac-12'], isLocked: true },
    // 2. Java Programming Lab (CS208L - 3 continuous periods): Wednesday Periods 5, 6, 7
    { id: 'pre-lab-2b-4', sectionId: 'sec-2b', day: 'Wednesday', periodNumber: 5, type: 'ACADEMIC', isLab: true, subjectId: 'sub-208L', label: 'CS208L Lab', facultyIds: ['fac-5', 'fac-4'], isLocked: true },
    { id: 'pre-lab-2b-5', sectionId: 'sec-2b', day: 'Wednesday', periodNumber: 6, type: 'ACADEMIC', isLab: true, subjectId: 'sub-208L', label: 'CS208L Lab', facultyIds: ['fac-5', 'fac-4'], isLocked: true },
    { id: 'pre-lab-2b-6', sectionId: 'sec-2b', day: 'Wednesday', periodNumber: 7, type: 'ACADEMIC', isLab: true, subjectId: 'sub-208L', label: 'CS208L Lab', facultyIds: ['fac-5', 'fac-4'], isLocked: true },

    // Year 3 Sec A:
    // 1. DBMS & SQL Lab (CS307L - 3 continuous periods): Monday Periods 5, 6, 7
    { id: 'pre-lab-3a-1', sectionId: 'sec-3a', day: 'Monday', periodNumber: 5, type: 'ACADEMIC', isLab: true, subjectId: 'sub-307L', label: 'CS307L Lab', facultyIds: ['fac-6', 'fac-7'], isLocked: true },
    { id: 'pre-lab-3a-2', sectionId: 'sec-3a', day: 'Monday', periodNumber: 6, type: 'ACADEMIC', isLab: true, subjectId: 'sub-307L', label: 'CS307L Lab', facultyIds: ['fac-6', 'fac-7'], isLocked: true },
    { id: 'pre-lab-3a-3', sectionId: 'sec-3a', day: 'Monday', periodNumber: 7, type: 'ACADEMIC', isLab: true, subjectId: 'sub-307L', label: 'CS307L Lab', facultyIds: ['fac-6', 'fac-7'], isLocked: true },
    // 2. Operating Systems Lab (CS308L - 3 continuous periods): Wednesday Periods 5, 6, 7
    { id: 'pre-lab-3a-4', sectionId: 'sec-3a', day: 'Wednesday', periodNumber: 5, type: 'ACADEMIC', isLab: true, subjectId: 'sub-308L', label: 'CS308L Lab', facultyIds: ['fac-2', 'fac-3'], isLocked: true },
    { id: 'pre-lab-3a-5', sectionId: 'sec-3a', day: 'Wednesday', periodNumber: 6, type: 'ACADEMIC', isLab: true, subjectId: 'sub-308L', label: 'CS308L Lab', facultyIds: ['fac-2', 'fac-3'], isLocked: true },
    { id: 'pre-lab-3a-6', sectionId: 'sec-3a', day: 'Wednesday', periodNumber: 7, type: 'ACADEMIC', isLab: true, subjectId: 'sub-308L', label: 'CS308L Lab', facultyIds: ['fac-2', 'fac-3'], isLocked: true },

    // Year 4 Sec A:
    // 1. AI & Deep Learning Lab (CS407L - 3 continuous periods): Tuesday Periods 5, 6, 7
    { id: 'pre-lab-4a-1', sectionId: 'sec-4a', day: 'Tuesday', periodNumber: 5, type: 'ACADEMIC', isLab: true, subjectId: 'sub-407L', label: 'CS407L Lab', facultyIds: ['fac-1', 'fac-8'], isLocked: true },
    { id: 'pre-lab-4a-2', sectionId: 'sec-4a', day: 'Tuesday', periodNumber: 6, type: 'ACADEMIC', isLab: true, subjectId: 'sub-407L', label: 'CS407L Lab', facultyIds: ['fac-1', 'fac-8'], isLocked: true },
    { id: 'pre-lab-4a-3', sectionId: 'sec-4a', day: 'Tuesday', periodNumber: 7, type: 'ACADEMIC', isLab: true, subjectId: 'sub-407L', label: 'CS407L Lab', facultyIds: ['fac-1', 'fac-8'], isLocked: true },
    // 2. Major Capstone Project (CS409P - 3 continuous periods): Thursday Periods 5, 6, 7
    { id: 'pre-lab-4a-4', sectionId: 'sec-4a', day: 'Thursday', periodNumber: 5, type: 'ACADEMIC', isLab: true, subjectId: 'sub-409P', label: 'CS409P Project', facultyIds: ['fac-1', 'fac-2'], isLocked: true },
    { id: 'pre-lab-4a-5', sectionId: 'sec-4a', day: 'Thursday', periodNumber: 6, type: 'ACADEMIC', isLab: true, subjectId: 'sub-409P', label: 'CS409P Project', facultyIds: ['fac-1', 'fac-2'], isLocked: true },
    { id: 'pre-lab-4a-6', sectionId: 'sec-4a', day: 'Thursday', periodNumber: 7, type: 'ACADEMIC', isLab: true, subjectId: 'sub-409P', label: 'CS409P Project', facultyIds: ['fac-1', 'fac-2'], isLocked: true },
  ];

  // -------------------------------------------------------------
  // Tally Engine (Pre-Flight Dynamic Tally & Reconciliation Engine)
  // -------------------------------------------------------------
  const TallyEngine = {
    /**
     * Checks if a given period slot is strictly disabled by schedule rules
     * Saturday has strictly Periods 1 to 4 only (Periods 5, 6, 7 are completely inactive / removed)
     */
    isSlotDisabled(day, periodNumber, scheduleConfig) {
      const config = scheduleConfig || DEFAULT_SCHEDULE_CONFIG;
      if (day === 'Saturday') {
        const disabled = config.saturdayDisabledPeriods || [5, 6, 7];
        if (disabled.includes(periodNumber)) return true;
        const maxP = config.saturdayMaxPeriods || 4;
        if (periodNumber > maxP) return true;
      }
      return false;
    },

    /**
     * Get list of ALL valid active periods for a given day (excluding disabled periods)
     */
    getActivePeriodsForDay(day, scheduleConfig) {
      const config = scheduleConfig || DEFAULT_SCHEDULE_CONFIG;
      if (day === 'Saturday') {
        const maxP = config.saturdayMaxPeriods || 4;
        const disabled = config.saturdayDisabledPeriods || [5, 6, 7];
        return config.periods.filter((p) => p.id <= maxP && !disabled.includes(p.id));
      }
      return config.periods;
    },

    /**
     * Get total weekly active working periods available for a section
     * Monday to Friday: 5 * 7 = 35 periods
     * Saturday: 1 * 4 = 4 periods
     * Total = 39 periods per week
     */
    getTotalPeriodsForWeek(scheduleConfig) {
      const config = scheduleConfig || DEFAULT_SCHEDULE_CONFIG;
      let total = 0;
      config.days.forEach((day) => {
        total += this.getActivePeriodsForDay(day, config).length;
      });
      return total;
    },

    /**
     * Dynamic Tally & Remaining Hours Calculation (Per-Section Mathematical Reconciliation)
     * Step 1: Calculate total weekly operational periods per class based on the grid structure (39 Periods)
     * Step 2: Sum the manually prefixed theory hours and prefixed lab hours for that class
     * Step 3: Compute Remaining Hours Breakdown:
     *         Remaining Unassigned Theory Hours = Total Theory Hours - Prefixed Theory Hours
     *         Remaining Unassigned Lab Hours = Total Lab Hours - Prefixed Lab Hours
     *         Remaining Open Slots = Total Working Slots - Total Prefixed Slots
     * Step 4: Validation Rule:
     *         Remaining Theory Hours + Remaining Lab Hours === Remaining Open Slots
     */
    calculateSectionTally(section, subjects, allocations, prefixedSlots, scheduleConfig) {
      const config = scheduleConfig || DEFAULT_SCHEDULE_CONFIG;
      // Step 1: Total working slots (39)
      const totalWorkingSlots = this.getTotalPeriodsForWeek(config);
      const sectionAllocations = allocations.filter((a) => a.sectionId === section.id);

      // Filter prefixed slots belonging to this section or global ALL (excluding disabled slots)
      const sectionPrefixed = prefixedSlots.filter((slot) => {
        if (slot.sectionId !== 'ALL' && slot.sectionId !== section.id) return false;
        if (this.isSlotDisabled(slot.day, slot.periodNumber, config)) return false;
        return true;
      });

      // Pure academic prefixed theory vs lab
      const prefixedTheorySlots = sectionPrefixed.filter((slot) => !slot.isLab);
      const prefixedLabSlots = sectionPrefixed.filter((slot) => Boolean(slot.isLab));

      const prefixedTheoryHours = prefixedTheorySlots.length;
      const prefixedLabHours = prefixedLabSlots.length;
      // Step 2: Sum manually prefixed theory & lab hours
      const totalPrefixedSlots = prefixedTheoryHours + prefixedLabHours;

      let totalTheoryHours = 0;
      let totalLabHours = 0;
      const allocatedSubjectDetails = [];

      sectionAllocations.forEach((alloc) => {
        const sub = subjects.find((s) => s.id === alloc.subjectId);
        if (sub) {
          const tHours = Number(sub.theoryHoursPerWeek) || 0;
          const lHours = Number(sub.labHoursPerWeek) || 0;
          totalTheoryHours += tHours;
          totalLabHours += lHours;

          // Count how many hours of this specific subject are prefixed for this section
          const subPrefixedHours = sectionPrefixed.filter((s) => s.subjectId === sub.id).length;
          const remainingHours = Math.max(0, (tHours + lHours) - subPrefixedHours);

          allocatedSubjectDetails.push({
            subject: sub,
            theoryHours: tHours,
            labHours: lHours,
            totalHours: tHours + lHours,
            prefixedHours: subPrefixedHours,
            remainingHours: remainingHours,
            facultyIds: alloc.facultyIds || [],
          });
        }
      });

      const totalCurriculumHours = totalTheoryHours + totalLabHours;

      // Step 3: Compute Remaining Hours Breakdown:
      const remainingTheoryHours = Math.max(0, totalTheoryHours - prefixedTheoryHours);
      const remainingLabHours = Math.max(0, totalLabHours - prefixedLabHours);
      const remainingOpenSlots = Math.max(0, totalWorkingSlots - totalPrefixedSlots);
      const remainingToAutoFill = remainingTheoryHours + remainingLabHours;

      // Step 4: Validation Rule:
      // Remaining Theory Hours + Remaining Lab Hours === Remaining Open Slots
      const difference = remainingToAutoFill - remainingOpenSlots;
      let status = 'BALANCED';
      if (difference > 0) status = 'OVERFLOW';
      else if (difference < 0) status = 'SHORT';

      const statusText = status === 'BALANCED'
        ? 'Balanced'
        : status === 'SHORT'
        ? `Short by ${Math.abs(difference)} hrs`
        : `Overflow by ${difference} hrs`;

      const badgeText = `Total: ${totalWorkingSlots} Slots | Prefixed: ${totalPrefixedSlots} Slots | Remaining to Auto-Fill: ${remainingToAutoFill} Slots — ${statusText}`;

      return {
        sectionId: section.id,
        sectionName: `${section.year === 1 ? '1st' : section.year === 2 ? '2nd' : section.year === 3 ? '3rd' : '4th'} Yr - ${section.name}`,
        totalAvailable: totalWorkingSlots,
        totalWorkingSlots,
        totalTheoryHours,
        totalLabHours,
        totalCurriculumHours,
        prefixedTheoryHours,
        prefixedLabHours,
        totalPrefixedSlots,
        prefixedCount: totalPrefixedSlots,
        remainingTheoryHours,
        remainingLabHours,
        remainingOpenSlots,
        remainingToAutoFill,
        difference,
        status,
        badgeText,
        isBalanced: status === 'BALANCED',
        allocatedSubjectDetails,
      };
    },

    /**
     * Auto-balances a short section by adjusting theory hours across core subjects to perfectly tally to 39
     */
    autoBalanceSection(sectionId, currentPrefixedSlots, shortageCount, scheduleConfig) {
      // In pure academic mode, auto-balance is achieved by adjusting curriculum hours
      return currentPrefixedSlots;
    },

    /**
     * Auto-balances curriculum theory hours if a section is short or overflowing
     */
    autoBalanceCurriculum(sectionId, subjects, allocations, difference) {
      if (difference === 0) return subjects;
      const secAllocs = allocations.filter((a) => a.sectionId === sectionId);
      const theorySubIds = secAllocs
        .map((a) => subjects.find((s) => s.id === a.subjectId))
        .filter((s) => s && !s.isLab && (s.theoryHoursPerWeek > 0 || s.labHoursPerWeek === 0))
        .map((s) => s.id);

      if (theorySubIds.length === 0) return subjects;

      let remainingDiff = difference;
      let updated = [...subjects];

      while (remainingDiff !== 0) {
        let changedInPass = false;
        for (const subId of theorySubIds) {
          if (remainingDiff === 0) break;
          const idx = updated.findIndex((s) => s.id === subId);
          if (idx >= 0) {
            if (remainingDiff < 0) {
              // Need more hours
              updated[idx] = { ...updated[idx], theoryHoursPerWeek: (Number(updated[idx].theoryHoursPerWeek) || 0) + 1 };
              remainingDiff += 1;
              changedInPass = true;
            } else if (remainingDiff > 0 && (Number(updated[idx].theoryHoursPerWeek) || 0) > 1) {
              // Overflow
              updated[idx] = { ...updated[idx], theoryHoursPerWeek: Math.max(1, (Number(updated[idx].theoryHoursPerWeek) || 0) - 1) };
              remainingDiff -= 1;
              changedInPass = true;
            }
          }
        }
        if (!changedInPass) break;
      }

      return updated;
    },

    /**
     * Check if entire college configuration is ready for generation
     */
    validateAllSectionsReady(sections, subjects, allocations, prefixedSlots, scheduleConfig) {
      const results = sections.map((sec) =>
        this.calculateSectionTally(sec, subjects, allocations, prefixedSlots, scheduleConfig)
      );
      const hasErrors = results.some((r) => r.status !== 'BALANCED');
      const totalShort = results.filter((r) => r.status === 'SHORT').reduce((sum, r) => sum + Math.abs(r.difference), 0);
      const totalOverflow = results.filter((r) => r.status === 'OVERFLOW').reduce((sum, r) => sum + r.difference, 0);

      return {
        isReady: !hasErrors,
        results,
        hasErrors,
        totalShort,
        totalOverflow,
      };
    },
  };

  // -------------------------------------------------------------
  // Workload Engine (Internal + Other-Department External Load)
  // -------------------------------------------------------------
  const WorkloadEngine = {
    calculateFacultyWorkloads(facultyList, subjects, allocations) {
      const workloadMap = {};

      facultyList.forEach((fac) => {
        // Calculate external other-department locked hours
        const extLoads = fac.externalLoads || [];
        const externalHours = extLoads.reduce((sum, item) => sum + (Number(item.hours) || 1), 0);

        workloadMap[fac.id] = {
          faculty: fac,
          assignedInternalTheoryHours: 0,
          assignedInternalLabHours: 0,
          totalInternalAssigned: 0,
          externalHours: externalHours,
          externalLoads: extLoads,
          totalAssigned: externalHours, // Start with external load
          maxWorkload: Number(fac.maxWorkloadHours) || 18,
          remaining: Number(fac.maxWorkloadHours) || 18,
          assignments: [],
          status: 'NORMAL',
        };
      });

      // Add internal allocations
      allocations.forEach((alloc) => {
        const sub = subjects.find((s) => s.id === alloc.subjectId);
        if (!sub) return;

        const fIds = alloc.facultyIds || [];
        fIds.forEach((fId) => {
          if (!workloadMap[fId]) return;
          const isLab = sub.isLab || (sub.labHoursPerWeek > 0 && sub.theoryHoursPerWeek === 0);
          const hours = isLab ? Number(sub.labHoursPerWeek) || 0 : Number(sub.theoryHoursPerWeek) || 0;

          if (isLab) {
            workloadMap[fId].assignedInternalLabHours += hours;
          } else {
            workloadMap[fId].assignedInternalTheoryHours += hours;
          }
          workloadMap[fId].totalInternalAssigned += hours;
          workloadMap[fId].totalAssigned += hours;
          workloadMap[fId].assignments.push({
            sectionId: alloc.sectionId,
            subjectId: sub.id,
            subjectCode: sub.code,
            subjectName: sub.name,
            hours,
            isLab,
          });
        });
      });

      // Compute remaining hours and statuses
      Object.keys(workloadMap).forEach((fId) => {
        const item = workloadMap[fId];
        item.remaining = item.maxWorkload - item.totalAssigned;
        const ratio = item.totalAssigned / item.maxWorkload;
        if (item.totalAssigned > item.maxWorkload) {
          item.status = 'OVERLOADED';
        } else if (ratio >= 0.85) {
          item.status = 'WARNING';
        } else {
          item.status = 'NORMAL';
        }
      });

      return workloadMap;
    },
  };

  // -------------------------------------------------------------
  // Timetable Generator (CSP Backtracking Solver)
  // Constraints:
  // 1. Hard Collisions: Zero faculty collisions at (day, period),
  //    strictly respecting their Other Department Locked Load.
  //    Saturday Period 5 must remain empty/skipped for all classes and faculty.
  // 2. Prefix Inviolability: Pre-assigned theory, labs, tests, library, and other-dept slots
  // 3. Continuous Lab Allocation: 2 or 3 consecutive periods, morning or afternoon, never across lunch.
  // 4. Balanced Distribution (Spread Constraint): 1 hr/day theory, varied timings, morning/afternoon proportionality.
  // 5. No Consecutive Fatigue: No back-to-back same subject or faculty in same class.
  // -------------------------------------------------------------
  const TimetableGenerator = {
    generate({ sections, subjects, faculty, allocations, prefixedSlots, scheduleConfig, maxAttempts = 250 }) {
      const startTime = performance.now();
      const config = scheduleConfig || DEFAULT_SCHEDULE_CONFIG;

      const subjectsMap = {};
      subjects.forEach((s) => (subjectsMap[s.id] = s));
      const facultyMap = {};
      faculty.forEach((f) => (facultyMap[f.id] = f));
      const sectionsMap = {};
      sections.forEach((sec) => (sectionsMap[sec.id] = sec));

      // Build rapid lookup for faculty external other-department locked slots
      // externalLoadsMap[facultyId][day][periodNumber] = { department, subject }
      const externalLoadsMap = {};
      faculty.forEach((fac) => {
        externalLoadsMap[fac.id] = {};
        (fac.externalLoads || []).forEach((ext) => {
          if (!externalLoadsMap[fac.id][ext.day]) externalLoadsMap[fac.id][ext.day] = {};
          externalLoadsMap[fac.id][ext.day][ext.period] = ext;
        });
      });

      // Run CSP with randomized restart heuristic
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const result = this._solveOnce({
          sections,
          subjects,
          faculty,
          allocations,
          prefixedSlots,
          config,
          subjectsMap,
          facultyMap,
          sectionsMap,
          externalLoadsMap,
          seed: attempt,
        });

        if (result.success) {
          const endTime = performance.now();
          return {
            success: true,
            timetable: result.timetable,
            stats: {
              attemptCount: attempt,
              executionTimeMs: Math.round(endTime - startTime),
              totalSlotsScheduled: result.totalSlotsScheduled,
              clashesCount: 0,
            },
          };
        }
      }

      // Best-effort fallback
      const fallbackResult = this._solveBestEffort({
        sections,
        subjects,
        faculty,
        allocations,
        prefixedSlots,
        config,
        subjectsMap,
        facultyMap,
        sectionsMap,
        externalLoadsMap,
      });

      const endTime = performance.now();
      return {
        success: false,
        warning: 'Could not satisfy 100% of strict spread constraints without minor conflicts. Best-effort schedule generated.',
        timetable: fallbackResult.timetable,
        stats: {
          attemptCount: maxAttempts,
          executionTimeMs: Math.round(endTime - startTime),
          totalSlotsScheduled: fallbackResult.totalSlotsScheduled,
          clashesCount: fallbackResult.clashesCount,
        },
      };
    },

    _solveOnce({
      sections,
      subjects,
      faculty,
      allocations,
      prefixedSlots,
      config,
      subjectsMap,
      facultyMap,
      sectionsMap,
      externalLoadsMap,
      seed,
    }) {
      // 1. Initialize grid: timetable[sectionId][day][periodNumber]
      const timetable = {};
      sections.forEach((sec) => {
        timetable[sec.id] = {};
        config.days.forEach((day) => {
          timetable[sec.id][day] = {};
          config.periods.forEach((p) => {
            // Strictly mark disabled periods (e.g. Saturday Period 5)
            if (TallyEngine.isSlotDisabled(day, p.id, config)) {
              timetable[sec.id][day][p.id] = {
                type: 'DISABLED',
                label: 'DISABLED / OFF',
                isLocked: true,
                isDisabled: true,
                subjectCode: 'OFF',
                subjectName: 'Disabled Period',
                facultyIds: [],
                facultyNames: [],
                isLab: false,
                color: '#64748b',
              };
            } else {
              timetable[sec.id][day][p.id] = null;
            }
          });
        });
      });

      // 2. Lock Inviolable Prefixed Slots (Constraint 2: Fixed pre-allocated academic & institutional slots)
      for (const slot of prefixedSlots) {
        // Skip if slot falls on a disabled period
        if (TallyEngine.isSlotDisabled(slot.day, slot.periodNumber, config)) continue;

        const targetSections = slot.sectionId === 'ALL' ? sections : sections.filter((s) => s.id === slot.sectionId);
        for (const sec of targetSections) {
          if (timetable[sec.id][slot.day] && timetable[sec.id][slot.day][slot.periodNumber] !== undefined) {
            const sub = slot.subjectId ? subjectsMap[slot.subjectId] : null;
            const fIds = (slot.facultyIds && slot.facultyIds.length > 0)
              ? slot.facultyIds
              : (slot.facultyId ? [slot.facultyId] : []);
            const fNames = fIds.map((fId) => (facultyMap[fId] ? facultyMap[fId].name : ''));

            const isLab = Boolean(slot.isLab || (sub && (sub.isLab || sub.labHoursPerWeek > 0)));
            const isAcademic = slot.type === 'ACADEMIC' || Boolean(slot.subjectId);

            timetable[sec.id][slot.day][slot.periodNumber] = {
              type: isAcademic ? (isLab ? 'LAB' : 'THEORY') : 'PREFIX',
              label: slot.label || (sub ? sub.name : 'Fixed Slot'),
              isLocked: true,
              isPrefixed: true,
              subjectId: slot.subjectId || null,
              subjectCode: sub ? sub.code : (isAcademic ? 'SUB' : 'FIXED'),
              subjectName: sub ? sub.name : slot.label,
              facultyIds: fIds,
              facultyNames: fNames,
              isLab: isLab,
              color: (sub && sub.color) || (isAcademic ? (isLab ? '#ec4899' : '#4f46e5') : '#64748b'),
            };
          }
        }
      }

      // 3. Prepare task list: Deduct already-prefixed academic hours (Labs first, then Theory)
      const labTasks = [];
      const theoryTasks = [];

      sections.forEach((sec) => {
        const secAllocations = allocations.filter((a) => a.sectionId === sec.id);
        secAllocations.forEach((alloc) => {
          const sub = subjectsMap[alloc.subjectId];
          if (!sub) return;

          // Check if this lab has already been prefixed (fully or partially)
          if (sub.isLab || sub.labHoursPerWeek > 0) {
            let prefixedLabHours = 0;
            config.days.forEach((day) => {
              config.periods.forEach((p) => {
                const cell = timetable[sec.id][day][p.id];
                if (cell && cell.isPrefixed && cell.isLab && cell.subjectId === sub.id) {
                  prefixedLabHours++;
                }
              });
            });

            const neededLabHours = (sub.labHoursPerWeek || 3) - prefixedLabHours;
            if (neededLabHours > 0) {
              labTasks.push({
                sectionId: sec.id,
                subjectId: sub.id,
                subject: sub,
                facultyIds: alloc.facultyIds || [],
                duration: neededLabHours,
                isLab: true,
              });
            }
          }

          // Check if theory hours have already been prefixed
          if (sub.theoryHoursPerWeek > 0) {
            let prefixedTheoryHours = 0;
            config.days.forEach((day) => {
              config.periods.forEach((p) => {
                const cell = timetable[sec.id][day][p.id];
                if (cell && cell.isPrefixed && !cell.isLab && cell.subjectId === sub.id) {
                  prefixedTheoryHours++;
                }
              });
            });

            const neededTheoryHours = sub.theoryHoursPerWeek - prefixedTheoryHours;
            if (neededTheoryHours > 0) {
              theoryTasks.push({
                sectionId: sec.id,
                subjectId: sub.id,
                subject: sub,
                facultyIds: alloc.facultyIds || [],
                hoursCount: neededTheoryHours,
                isLab: false,
              });
            }
          }
        });
      });

      this._shuffle(labTasks, seed);

      // 4. Place Labs (2 or 3 contiguous periods; never bridging lunch; never Saturday P5)
      for (const lab of labTasks) {
        const placed = this._placeLabBlock(timetable, lab, config, facultyMap, sectionsMap, externalLoadsMap);
        if (!placed) {
          return { success: false };
        }
      }

      // 5. Expand theory tasks into 1-hour slots
      const theoryUnits = [];
      theoryTasks.forEach((task) => {
        for (let i = 0; i < task.hoursCount; i++) {
          theoryUnits.push({
            id: `${task.sectionId}_${task.subjectId}_${i}`,
            sectionId: task.sectionId,
            subjectId: task.subjectId,
            subject: task.subject,
            facultyIds: task.facultyIds,
            unitIndex: i,
            totalUnits: task.hoursCount,
          });
        }
      });

      theoryUnits.sort((a, b) => b.totalUnits - a.totalUnits);

      // 6. Backtracking search to place theory periods
      const searchState = { backtracks: 0, maxBacktracks: 3500 };
      const solved = this._backtrackTheory(0, theoryUnits, timetable, config, facultyMap, externalLoadsMap, searchState);
      if (!solved) {
        return { success: false };
      }

      // 7. Fill any remaining unassigned slots with Self-Study / Library
      let totalSlotsScheduled = 0;
      sections.forEach((sec) => {
        config.days.forEach((day) => {
          config.periods.forEach((p) => {
            if (timetable[sec.id][day][p.id] === null) {
              timetable[sec.id][day][p.id] = {
                type: 'SELF_STUDY',
                label: 'Library / Self-Study',
                isLocked: false,
                subjectCode: 'STUDY',
                subjectName: 'Self-Study / Library',
                facultyIds: [],
                facultyNames: [],
                isLab: false,
                color: '#94a3b8',
              };
            }
            if (timetable[sec.id][day][p.id] && !timetable[sec.id][day][p.id].isDisabled) {
              totalSlotsScheduled++;
            }
          });
        });
      });

      return {
        success: true,
        timetable,
        totalSlotsScheduled,
      };
    },

    /**
     * Places a continuous Lab block (2 or 3 hours)
     * Strictly avoids lunch break, disabled slots (Saturday Period 5), and external faculty commitments!
     */
    _placeLabBlock(timetable, lab, config, facultyMap, sectionsMap, externalLoadsMap) {
      const { sectionId, subject, facultyIds, duration } = lab;
      const validSlots = [];

      const candidateStarts = [];
      if (duration === 3) {
        candidateStarts.push({ session: 'morning', startPeriods: [1, 2] });
        candidateStarts.push({ session: 'afternoon', startPeriods: [5] });
      } else if (duration === 2) {
        candidateStarts.push({ session: 'morning', startPeriods: [1, 2, 3] });
        candidateStarts.push({ session: 'afternoon', startPeriods: [5, 6] });
      } else {
        candidateStarts.push({ session: 'morning', startPeriods: [1] });
      }

      for (const day of config.days) {
        // Saturday lab restriction: Saturday only has morning periods (Periods 1-4).
        // Afternoon labs cannot be scheduled on Saturday!
        if (day === 'Saturday' && candidateStarts.some((c) => c.session === 'afternoon')) {
          // Only evaluate morning candidates for Saturday
        }

        const alreadyHasLabThisDay = Object.values(timetable[sectionId][day]).some((slot) => slot && slot.isLab);
        if (alreadyHasLabThisDay) continue;

        for (const candidate of candidateStarts) {
          if (day === 'Saturday' && candidate.session === 'afternoon') continue;

          for (const startP of candidate.startPeriods) {
            let blockValid = true;

            for (let offset = 0; offset < duration; offset++) {
              const p = startP + offset;

              // Check if period is disabled (e.g. Saturday Period 5)
              if (TallyEngine.isSlotDisabled(day, p, config)) {
                blockValid = false;
                break;
              }

              // Check if slot in section is free
              if (timetable[sectionId][day][p] !== null) {
                blockValid = false;
                break;
              }

              // Check Constraint 1: Zero Faculty Clash across other sections
              // AND strictly check Other-Department Locked Load!
              if (this._isAnyFacultyBooked(timetable, facultyIds, day, p, sectionId, externalLoadsMap)) {
                blockValid = false;
                break;
              }
            }

            if (blockValid) {
              validSlots.push({ day, startP });
            }
          }
        }
      }

      // Secondary pass: allow lab on a day with another lab in opposite session if needed
      if (validSlots.length === 0) {
        for (const day of config.days) {
          for (const candidate of candidateStarts) {
            if (day === 'Saturday' && candidate.session === 'afternoon') continue;

            for (const startP of candidate.startPeriods) {
              let blockValid = true;

              for (let offset = 0; offset < duration; offset++) {
                const p = startP + offset;
                if (TallyEngine.isSlotDisabled(day, p, config)) {
                  blockValid = false;
                  break;
                }
                if (timetable[sectionId][day][p] !== null) {
                  blockValid = false;
                  break;
                }
                if (this._isAnyFacultyBooked(timetable, facultyIds, day, p, sectionId, externalLoadsMap)) {
                  blockValid = false;
                  break;
                }
              }

              if (blockValid) {
                validSlots.push({ day, startP });
              }
            }
          }
        }
      }

      if (validSlots.length === 0) return false;

      const chosen = validSlots[Math.floor(Math.random() * validSlots.length)];
      const facultyNames = facultyIds.map((fId) => (facultyMap[fId] ? facultyMap[fId].name : ''));

      for (let offset = 0; offset < duration; offset++) {
        const p = chosen.startP + offset;
        timetable[sectionId][chosen.day][p] = {
          type: 'LAB',
          label: `${subject.code} Lab`,
          isLocked: false,
          isLab: true,
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectName: subject.name,
          facultyIds: facultyIds,
          facultyNames: facultyNames,
          labBlock: { startPeriod: chosen.startP, duration, index: offset + 1 },
          room: sectionsMap[sectionId] ? sectionsMap[sectionId].labRoom : 'Lab',
          color: subject.color || '#ec4899',
        };
      }

      return true;
    },

    /**
     * Backtracking recursive solver for theory units
     */
    _backtrackTheory(index, units, timetable, config, facultyMap, externalLoadsMap, searchState) {
      if (searchState) {
        searchState.backtracks++;
        if (searchState.backtracks > searchState.maxBacktracks) {
          return false;
        }
      }

      if (index >= units.length) {
        return true;
      }

      const unit = units[index];
      const { sectionId, subjectId, subject, facultyIds } = unit;
      const candidateSlots = [];

      for (const day of config.days) {
        const activePeriods = TallyEngine.getActivePeriodsForDay(day, config);

        // Constraint 4: Spread constraint (max 1 hr/day per subject, max 2 if hours > days)
        let subjectCountThisDay = 0;
        for (const p of activePeriods) {
          const slot = timetable[sectionId][day][p.id];
          if (slot && slot.subjectId === subjectId) {
            subjectCountThisDay++;
          }
        }

        const maxAllowedPerDay = unit.totalUnits > config.days.length ? 2 : 1;
        if (subjectCountThisDay >= maxAllowedPerDay) continue;

        for (const p of activePeriods) {
          // Skip if slot is disabled (Saturday Period 5)
          if (TallyEngine.isSlotDisabled(day, p.id, config)) continue;

          // Slot must be empty
          if (timetable[sectionId][day][p.id] !== null) continue;

          // Constraint 1: Zero Faculty Clash across other sections
          // AND Other Department Locked Load!
          if (this._isAnyFacultyBooked(timetable, facultyIds, day, p.id, sectionId, externalLoadsMap)) {
            continue;
          }

          // Constraint 5: No Consecutive Fatigue
          const prevSlot = timetable[sectionId][day][p.id - 1];
          const nextSlot = timetable[sectionId][day][p.id + 1];

          if (prevSlot && prevSlot.subjectId === subjectId) continue;
          if (nextSlot && nextSlot.subjectId === subjectId) continue;

          // Check consecutive faculty fatigue
          let facFatigue = false;
          if (facultyIds && facultyIds.length > 0) {
            if (prevSlot && prevSlot.facultyIds && prevSlot.facultyIds.some((f) => facultyIds.includes(f))) facFatigue = true;
            if (nextSlot && nextSlot.facultyIds && nextSlot.facultyIds.some((f) => facultyIds.includes(f))) facFatigue = true;
          }
          if (facFatigue) continue;

          // Soft Constraint Scoring (Heuristics):
          let score = 0;
          const isMorning = p.id <= config.lunchBreak.afterPeriod;

          // Morning vs afternoon distribution for this subject
          let mCount = 0;
          let aCount = 0;
          for (const d of config.days) {
            for (const checkP of TallyEngine.getActivePeriodsForDay(d, config)) {
              const s = timetable[sectionId][d][checkP.id];
              if (s && s.subjectId === subjectId) {
                if (checkP.id <= config.lunchBreak.afterPeriod) mCount++;
                else aCount++;
              }
            }
          }

          if (isMorning && mCount <= aCount) score += 20;
          if (!isMorning && aCount < mCount) score += 20;

          // Stagger period numbers across days
          for (const d of config.days) {
            const s = timetable[sectionId][d][p.id];
            if (s && s.subjectId === subjectId) score -= 30;
          }

          score += Math.random() * 5;

          candidateSlots.push({ day, period: p.id, score });
        }
      }

      candidateSlots.sort((a, b) => b.score - a.score);

      const facultyNames = facultyIds.map((fId) => (facultyMap[fId] ? facultyMap[fId].name : ''));

      for (const cand of candidateSlots) {
        timetable[sectionId][cand.day][cand.period] = {
          type: 'THEORY',
          label: subject.name,
          isLocked: false,
          isLab: false,
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectName: subject.name,
          facultyIds: facultyIds,
          facultyNames: facultyNames,
          color: subject.color || '#4f46e5',
        };

        if (this._backtrackTheory(index + 1, units, timetable, config, facultyMap, externalLoadsMap, searchState)) {
          return true;
        }

        timetable[sectionId][cand.day][cand.period] = null;
      }

      return false;
    },

    /**
     * Checks if any faculty member is booked in ANOTHER section at (day, period)
     * OR has an EXTERNAL OTHER-DEPARTMENT LOCKED COMMITMENT at (day, period)
     */
    _isAnyFacultyBooked(timetable, facultyIds, day, period, excludeSectionId, externalLoadsMap) {
      if (!facultyIds || facultyIds.length === 0) return false;

      // 1. Check External Other-Department Locked Load
      if (externalLoadsMap) {
        for (const fId of facultyIds) {
          if (externalLoadsMap[fId] && externalLoadsMap[fId][day] && externalLoadsMap[fId][day][period]) {
            return true; // Hard conflict barrier with other department!
          }
        }
      }

      // 2. Check collisions with other classes/sections
      for (const secId of Object.keys(timetable)) {
        if (secId === excludeSectionId) continue;
        const cell = timetable[secId][day] ? timetable[secId][day][period] : null;
        if (cell && cell.facultyIds && cell.facultyIds.length > 0) {
          for (const fId of facultyIds) {
            if (cell.facultyIds.includes(fId)) {
              return true; // Hard collision with another class!
            }
          }
        }
      }

      return false;
    },

    /**
     * Best-effort solver for overconstrained configurations
     */
    _solveBestEffort({ sections, subjects, faculty, allocations, prefixedSlots, config, subjectsMap, facultyMap, sectionsMap, externalLoadsMap }) {
      const timetable = {};
      sections.forEach((sec) => {
        timetable[sec.id] = {};
        config.days.forEach((day) => {
          timetable[sec.id][day] = {};
          config.periods.forEach((p) => {
            if (TallyEngine.isSlotDisabled(day, p.id, config)) {
              timetable[sec.id][day][p.id] = {
                type: 'DISABLED',
                label: 'DISABLED / OFF',
                isLocked: true,
                isDisabled: true,
                subjectCode: 'OFF',
                subjectName: 'Disabled Period',
                facultyIds: [],
                facultyNames: [],
                isLab: false,
                color: '#64748b',
              };
            } else {
              timetable[sec.id][day][p.id] = null;
            }
          });
        });
      });

      // Lock prefixes
      for (const slot of prefixedSlots) {
        if (TallyEngine.isSlotDisabled(slot.day, slot.periodNumber, config)) continue;
        const targetSections = slot.sectionId === 'ALL' ? sections : sections.filter((s) => s.id === slot.sectionId);
        for (const sec of targetSections) {
          if (timetable[sec.id][slot.day] && timetable[sec.id][slot.day][slot.periodNumber] !== undefined) {
            const sub = slot.subjectId ? subjectsMap[slot.subjectId] : null;
            const fIds = (slot.facultyIds && slot.facultyIds.length > 0)
              ? slot.facultyIds
              : (slot.facultyId ? [slot.facultyId] : []);
            const fNames = fIds.map((fId) => (facultyMap[fId] ? facultyMap[fId].name : ''));

            const isLab = Boolean(slot.isLab || (sub && (sub.isLab || sub.labHoursPerWeek > 0)));
            const isAcademic = slot.type === 'ACADEMIC' || Boolean(slot.subjectId);

            timetable[sec.id][slot.day][slot.periodNumber] = {
              type: isAcademic ? (isLab ? 'LAB' : 'THEORY') : 'PREFIX',
              label: slot.label || (sub ? sub.name : 'Fixed Slot'),
              isLocked: true,
              isPrefixed: true,
              subjectCode: sub ? sub.code : (isAcademic ? 'SUB' : 'FIXED'),
              subjectName: sub ? sub.name : slot.label,
              facultyIds: fIds,
              facultyNames: fNames,
              isLab: isLab,
              color: (sub && sub.color) || (isAcademic ? (isLab ? '#ec4899' : '#4f46e5') : '#64748b'),
            };
          }
        }
      }

      let totalSlotsScheduled = 0;
      let clashesCount = 0;

      // Schedule remaining labs (excluding already-prefixed lab hours)
      const labTasks = [];
      sections.forEach((sec) => {
        allocations.filter((a) => a.sectionId === sec.id).forEach((alloc) => {
          const sub = subjectsMap[alloc.subjectId];
          if (sub && (sub.isLab || sub.labHoursPerWeek > 0)) {
            let prefixedLabHours = 0;
            config.days.forEach((day) => {
              config.periods.forEach((p) => {
                const cell = timetable[sec.id][day][p.id];
                if (cell && cell.isPrefixed && cell.isLab && cell.subjectId === sub.id) {
                  prefixedLabHours++;
                }
              });
            });

            const neededLabHours = (sub.labHoursPerWeek || 3) - prefixedLabHours;
            if (neededLabHours > 0) {
              labTasks.push({
                sectionId: sec.id,
                subjectId: sub.id,
                subject: sub,
                facultyIds: alloc.facultyIds || [],
                duration: neededLabHours,
              });
            }
          }
        });
      });

      labTasks.forEach((lab) => {
        this._placeLabBlock(timetable, lab, config, facultyMap, sectionsMap, externalLoadsMap);
      });

      // Schedule remaining theory (excluding already-prefixed theory hours)
      sections.forEach((sec) => {
        const secAllocations = allocations.filter((a) => a.sectionId === sec.id);
        const needed = [];
        secAllocations.forEach((alloc) => {
          const sub = subjectsMap[alloc.subjectId];
          if (sub && sub.theoryHoursPerWeek > 0) {
            let prefixedTheoryHours = 0;
            config.days.forEach((day) => {
              config.periods.forEach((p) => {
                const cell = timetable[sec.id][day][p.id];
                if (cell && cell.isPrefixed && !cell.isLab && cell.subjectId === sub.id) {
                  prefixedTheoryHours++;
                }
              });
            });

            const remainingTheory = Math.max(0, sub.theoryHoursPerWeek - prefixedTheoryHours);
            for (let i = 0; i < remainingTheory; i++) {
              needed.push({ subject: sub, facultyIds: alloc.facultyIds || [] });
            }
          }
        });

        needed.forEach((task) => {
          let placed = false;
          for (const day of config.days) {
            if (placed) break;
            for (const p of TallyEngine.getActivePeriodsForDay(day, config)) {
              if (timetable[sec.id][day][p.id] === null) {
                const clash = this._isAnyFacultyBooked(timetable, task.facultyIds, day, p.id, sec.id, externalLoadsMap);
                if (!clash) {
                  timetable[sec.id][day][p.id] = {
                    type: 'THEORY',
                    label: task.subject.name,
                    isLocked: false,
                    isLab: false,
                    subjectId: task.subject.id,
                    subjectCode: task.subject.code,
                    subjectName: task.subject.name,
                    facultyIds: task.facultyIds,
                    facultyNames: task.facultyIds.map((fId) => facultyMap[fId]?.name || ''),
                    color: task.subject.color || '#4f46e5',
                  };
                  placed = true;
                  totalSlotsScheduled++;
                  break;
                }
              }
            }
          }

          if (!placed) {
            for (const day of config.days) {
              if (placed) break;
              for (const p of TallyEngine.getActivePeriodsForDay(day, config)) {
                if (timetable[sec.id][day][p.id] === null) {
                  clashesCount++;
                  timetable[sec.id][day][p.id] = {
                    type: 'THEORY',
                    label: task.subject.name,
                    isLocked: false,
                    isLab: false,
                    isClash: true,
                    subjectId: task.subject.id,
                    subjectCode: task.subject.code,
                    subjectName: task.subject.name,
                    facultyIds: task.facultyIds,
                    facultyNames: task.facultyIds.map((fId) => facultyMap[fId]?.name || ''),
                    color: '#ef4444',
                  };
                  placed = true;
                  totalSlotsScheduled++;
                  break;
                }
              }
            }
          }
        });
      });

      // Fill empty slots with study
      sections.forEach((sec) => {
        config.days.forEach((day) => {
          config.periods.forEach((p) => {
            if (timetable[sec.id][day][p.id] === null) {
              timetable[sec.id][day][p.id] = {
                type: 'SELF_STUDY',
                label: 'Library / Self-Study',
                isLocked: false,
                subjectCode: 'STUDY',
                subjectName: 'Self-Study / Library',
                facultyIds: [],
                facultyNames: [],
                isLab: false,
                color: '#94a3b8',
              };
            }
          });
        });
      });

      return { timetable, totalSlotsScheduled, clashesCount };
    },

    _shuffle(array, seed = 1) {
      let m = array.length,
        t,
        i;
      while (m) {
        i = Math.floor(Math.abs(Math.sin(seed + m)) * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
      }
      return array;
    },
  };

  // -------------------------------------------------------------
  // Drag-and-Swap Engine & Real-Time Conflict Detector
  // -------------------------------------------------------------
  const DragSwapEngine = {
    validateSwap({ timetable, sectionId, source, target, sections, facultyMap, facultyList, scheduleConfig }) {
      const conflicts = [];
      const config = scheduleConfig || DEFAULT_SCHEDULE_CONFIG;

      // 1. Hard Rule: Saturday Period 5 is strictly disabled
      if (TallyEngine.isSlotDisabled(target.day, target.period, config)) {
        conflicts.push(`Rule Violation: ${target.day} Period ${target.period} is strictly disabled / unallocatable.`);
      }
      if (TallyEngine.isSlotDisabled(source.day, source.period, config)) {
        conflicts.push(`Rule Violation: ${source.day} Period ${source.period} is strictly disabled / unallocatable.`);
      }

      const sourceCell = timetable[sectionId][source.day] ? timetable[sectionId][source.day][source.period] : null;
      const targetCell = timetable[sectionId][target.day] ? timetable[sectionId][target.day][target.period] : null;

      // 2. Hard Rule: Prefix Inviolability
      if (sourceCell && (sourceCell.isLocked || sourceCell.isDisabled)) {
        conflicts.push(`Locked Slot: "${sourceCell.label || sourceCell.subjectName}" at ${source.day} Period ${source.period} is fixed and cannot be moved.`);
      }
      if (targetCell && (targetCell.isLocked || targetCell.isDisabled)) {
        conflicts.push(`Locked Slot: "${targetCell.label || targetCell.subjectName}" at ${target.day} Period ${target.period} is fixed and cannot be overwritten.`);
      }

      // Rapid lookup for external other-department loads
      const extLoadsMap = {};
      (facultyList || []).forEach((fac) => {
        extLoadsMap[fac.id] = {};
        (fac.externalLoads || []).forEach((ext) => {
          if (!extLoadsMap[fac.id][ext.day]) extLoadsMap[fac.id][ext.day] = {};
          extLoadsMap[fac.id][ext.day][ext.period] = ext;
        });
      });

      // 3. Faculty Clash for sourceCell moving to target slot
      if (sourceCell && sourceCell.facultyIds && sourceCell.facultyIds.length > 0) {
        for (const fId of sourceCell.facultyIds) {
          const facName = facultyMap[fId] ? facultyMap[fId].name : fId;

          // Check Other Department Locked Load
          if (extLoadsMap[fId] && extLoadsMap[fId][target.day] && extLoadsMap[fId][target.day][target.period]) {
            const ext = extLoadsMap[fId][target.day][target.period];
            conflicts.push(
              `External Dept Clash: ${facName} is locked in "${ext.department} Dept" (${ext.subject}) on ${target.day} Period ${target.period}!`
            );
          }

          // Check collisions with other sections
          for (const otherSec of sections) {
            if (otherSec.id === sectionId) continue;
            const otherCell = timetable[otherSec.id][target.day] ? timetable[otherSec.id][target.day][target.period] : null;
            if (otherCell && otherCell.facultyIds && otherCell.facultyIds.includes(fId)) {
              conflicts.push(
                `Faculty Clash: ${facName} is already teaching in ${otherSec.name} (${otherCell.subjectName}) on ${target.day} Period ${target.period}!`
              );
            }
          }
        }
      }

      // 4. Faculty Clash for targetCell moving to source slot
      if (targetCell && targetCell.facultyIds && targetCell.facultyIds.length > 0) {
        for (const fId of targetCell.facultyIds) {
          const facName = facultyMap[fId] ? facultyMap[fId].name : fId;

          // Check Other Department Locked Load
          if (extLoadsMap[fId] && extLoadsMap[fId][source.day] && extLoadsMap[fId][source.day][source.period]) {
            const ext = extLoadsMap[fId][source.day][source.period];
            conflicts.push(
              `External Dept Clash: ${facName} is locked in "${ext.department} Dept" (${ext.subject}) on ${source.day} Period ${source.period}!`
            );
          }

          // Check collisions with other sections
          for (const otherSec of sections) {
            if (otherSec.id === sectionId) continue;
            const otherCell = timetable[otherSec.id][source.day] ? timetable[otherSec.id][source.day][source.period] : null;
            if (otherCell && otherCell.facultyIds && otherCell.facultyIds.includes(fId)) {
              conflicts.push(
                `Faculty Clash: ${facName} is already teaching in ${otherSec.name} (${otherCell.subjectName}) on ${source.day} Period ${source.period}!`
              );
            }
          }
        }
      }

      // 5. Continuous Lab Integrity
      if (sourceCell && sourceCell.isLab && source.day !== target.day) {
        conflicts.push(`Lab Continuity Notice: Moving a lab period across days splits the continuous lab block.`);
      }

      return {
        canSwap: conflicts.length === 0,
        conflicts,
      };
    },

    executeSwap({ timetable, sectionId, source, target }) {
      const updated = JSON.parse(JSON.stringify(timetable));
      const temp = updated[sectionId][source.day][source.period];
      updated[sectionId][source.day][source.period] = updated[sectionId][target.day][target.period];
      updated[sectionId][target.day][target.period] = temp;
      return updated;
    },
  };

  // -------------------------------------------------------------
  // Faculty Schedule & Matrix Engine
  // -------------------------------------------------------------
  const FacultyScheduleEngine = {
    getFacultySchedule(facultyId, facultyMember, timetable, sections, scheduleConfig) {
      const config = scheduleConfig || DEFAULT_SCHEDULE_CONFIG;
      const schedule = {};
      const sectionsMap = {};
      sections.forEach((s) => (sectionsMap[s.id] = s));

      const extLoads = (facultyMember && facultyMember.externalLoads) || [];
      const extMap = {};
      extLoads.forEach((ext) => {
        if (!extMap[ext.day]) extMap[ext.day] = {};
        extMap[ext.day][ext.period] = ext;
      });

      let totalTeachingHours = 0;
      let totalExternalHours = 0;
      let totalFreePeriods = 0;
      let clashesCount = 0;

      config.days.forEach((day) => {
        schedule[day] = {};

        config.periods.forEach((p) => {
          // Check if slot is strictly disabled
          if (TallyEngine.isSlotDisabled(day, p.id, config)) {
            schedule[day][p.id] = {
              status: 'DISABLED',
              label: 'OFF / DISABLED',
            };
            return;
          }

          // Check if faculty has an external other-department commitment
          const ext = extMap[day] ? extMap[day][p.id] : null;

          // Check which internal sections this faculty is teaching during (day, p.id)
          const occupied = [];
          if (timetable) {
            Object.keys(timetable).forEach((secId) => {
              const cell = timetable[secId][day] ? timetable[secId][day][p.id] : null;
              if (cell && cell.facultyIds && cell.facultyIds.includes(facultyId)) {
                occupied.push({
                  sectionId: secId,
                  section: sectionsMap[secId],
                  cell,
                });
              }
            });
          }

          if (ext && occupied.length > 0) {
            // Clash between Other Department commitment and internal class!
            clashesCount++;
            schedule[day][p.id] = {
              status: 'CLASH',
              isExternalClash: true,
              external: ext,
              clashingOccupations: occupied,
            };
            totalTeachingHours += occupied.length;
            totalExternalHours += Number(ext.hours) || 1;
          } else if (ext) {
            // Valid Other-Department Locked Load
            totalExternalHours += Number(ext.hours) || 1;
            schedule[day][p.id] = {
              status: 'OTHER_DEPT',
              external: ext,
              label: `LOCKED: ${ext.department} DEPT`,
            };
          } else if (occupied.length === 0) {
            // Free period
            schedule[day][p.id] = { status: 'FREE' };
            totalFreePeriods++;
          } else if (occupied.length === 1) {
            // Normal internal class
            schedule[day][p.id] = {
              status: 'OCCUPIED',
              ...occupied[0],
            };
            totalTeachingHours++;
          } else {
            // Double booked across internal sections
            clashesCount++;
            schedule[day][p.id] = {
              status: 'CLASH',
              clashingOccupations: occupied,
            };
            totalTeachingHours += occupied.length;
          }
        });
      });

      return {
        facultyId,
        schedule,
        totalTeachingHours,
        totalExternalHours,
        totalHoursAssigned: totalTeachingHours + totalExternalHours,
        totalFreePeriods,
        clashesCount,
      };
    },
  };

  // -------------------------------------------------------------
  // Prefix Engine (Auto-Prefix All Labs & Theory Pre-Allocation)
  // -------------------------------------------------------------
  const PrefixEngine = {
    /**
     * Auto-prefix all lab subjects for a given section or across all sections.
     * Finds clash-free 2 or 3 continuous period blocks respecting:
     * - Contiguity (2 or 3 consecutive periods)
     * - Never bridging lunch break
     * - Strictly avoiding Saturday Period 5 (and Saturday afternoon)
     * - Hard barriers of Other-Department Locked Loads
     * - Zero faculty collision with other sections
     */
    autoPrefixLabs({ sectionId = 'ALL', sections, subjects, allocations, prefixedSlots, scheduleConfig, facultyList }) {
      const config = scheduleConfig || DEFAULT_SCHEDULE_CONFIG;
      const targetSections = sectionId === 'ALL' ? sections : sections.filter((s) => s.id === sectionId);
      const subjectsMap = {};
      subjects.forEach((s) => (subjectsMap[s.id] = s));

      // Quick lookup for external other-department loads
      const extLoadsMap = {};
      (facultyList || []).forEach((f) => {
        extLoadsMap[f.id] = {};
        (f.externalLoads || []).forEach((ext) => {
          if (!extLoadsMap[f.id][ext.day]) extLoadsMap[f.id][ext.day] = {};
          extLoadsMap[f.id][ext.day][ext.period] = ext;
        });
      });

      const updatedSlots = [...prefixedSlots];
      let totalPrefixedCount = 0;

      // Candidate start blocks for duration 3 (periods 1-3 morning or 5-7 afternoon)
      // Note: Saturday afternoon is strictly disabled; avoid Saturday for labs or only morning
      const candidateBlocks3 = [
        { day: 'Monday', startP: 1 },
        { day: 'Monday', startP: 5 },
        { day: 'Tuesday', startP: 1 },
        { day: 'Tuesday', startP: 5 },
        { day: 'Wednesday', startP: 1 },
        { day: 'Wednesday', startP: 5 },
        { day: 'Thursday', startP: 1 },
        { day: 'Thursday', startP: 5 },
        { day: 'Friday', startP: 1 },
        { day: 'Friday', startP: 5 },
      ];

      // Candidate start blocks for duration 2
      const candidateBlocks2 = [
        { day: 'Monday', startP: 1 }, { day: 'Monday', startP: 3 }, { day: 'Monday', startP: 5 },
        { day: 'Tuesday', startP: 1 }, { day: 'Tuesday', startP: 3 }, { day: 'Tuesday', startP: 5 },
        { day: 'Wednesday', startP: 1 }, { day: 'Wednesday', startP: 3 }, { day: 'Wednesday', startP: 5 },
        { day: 'Thursday', startP: 1 }, { day: 'Thursday', startP: 3 }, { day: 'Thursday', startP: 5 },
        { day: 'Friday', startP: 1 }, { day: 'Friday', startP: 3 }, { day: 'Friday', startP: 5 },
      ];

      for (const sec of targetSections) {
        const secAllocs = allocations.filter((a) => a.sectionId === sec.id);
        const labAllocs = secAllocs.filter((a) => {
          const sub = subjectsMap[a.subjectId];
          return sub && (sub.isLab || sub.labHoursPerWeek > 0);
        });

        for (const alloc of labAllocs) {
          const sub = subjectsMap[alloc.subjectId];
          const duration = sub.labHoursPerWeek || 3;

          // Check how many hours are already prefixed for this lab
          const alreadyPrefixed = updatedSlots.filter(
            (s) => (s.sectionId === sec.id || s.sectionId === 'ALL') && s.subjectId === sub.id && s.isLab
          ).length;

          if (alreadyPrefixed >= duration) {
            continue; // Already fully prefixed
          }

          const candidates = duration === 3 ? candidateBlocks3 : candidateBlocks2;
          let placed = false;

          for (const cand of candidates) {
            if (placed) break;
            const { day, startP } = cand;

            // Check if section already has another lab on this day
            const alreadyHasLabThisDay = updatedSlots.some(
              (s) => (s.sectionId === sec.id || s.sectionId === 'ALL') && s.day === day && s.isLab
            );
            if (alreadyHasLabThisDay) continue;

            // Check if entire continuous block is valid and collision-free
            let blockValid = true;
            for (let offset = 0; offset < duration; offset++) {
              const p = startP + offset;

              // 1. Is slot disabled (e.g. Saturday Period 5)?
              if (TallyEngine.isSlotDisabled(day, p, config)) {
                blockValid = false;
                break;
              }

              // 2. Is slot in this section already taken?
              const slotOccupied = updatedSlots.some(
                (s) => (s.sectionId === sec.id || s.sectionId === 'ALL') && s.day === day && s.periodNumber === p
              );
              if (slotOccupied) {
                blockValid = false;
                break;
              }

              // 3. Check faculty clash (Other-Dept locked loads + other sections' prefixed slots)
              for (const fId of alloc.facultyIds || []) {
                if (extLoadsMap[fId] && extLoadsMap[fId][day] && extLoadsMap[fId][day][p]) {
                  blockValid = false; // Conflict with other department
                  break;
                }
                const busyInOtherPrefixed = updatedSlots.some(
                  (s) => s.day === day && s.periodNumber === p && s.sectionId !== sec.id && s.facultyIds && s.facultyIds.includes(fId)
                );
                if (busyInOtherPrefixed) {
                  blockValid = false; // Collision with another section's prefixed slot
                  break;
                }
              }

              if (!blockValid) break;
            }

            if (blockValid) {
              // Lock all periods of this continuous lab block
              for (let offset = 0; offset < duration; offset++) {
                const p = startP + offset;
                updatedSlots.push({
                  id: 'pre-lab-' + Math.random().toString(36).substring(2, 9),
                  sectionId: sec.id,
                  day,
                  periodNumber: p,
                  type: 'ACADEMIC',
                  isLab: true,
                  subjectId: sub.id,
                  label: `${sub.code} Lab`,
                  facultyIds: alloc.facultyIds || [],
                  duration,
                  blockStartPeriod: startP,
                  blockIndex: offset + 1,
                  isLocked: true,
                });
              }
              placed = true;
              totalPrefixedCount += duration;
            }
          }
        }
      }

      return {
        updatedSlots,
        totalPrefixedCount,
      };
    },
  };

  // Export globally
  window.TimetableCore = {
    DEFAULT_SCHEDULE_CONFIG,
    DEFAULT_FACULTY,
    DEFAULT_SUBJECTS,
    DEFAULT_SECTIONS,
    DEFAULT_ALLOCATIONS,
    DEFAULT_PREFIXED_SLOTS,
    TallyEngine,
    WorkloadEngine,
    TimetableGenerator,
    DragSwapEngine,
    FacultyScheduleEngine,
    PrefixEngine,
  };
})(window);
