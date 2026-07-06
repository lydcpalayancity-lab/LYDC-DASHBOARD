import React, { useState, useEffect } from 'react';
import { BARANGAYS } from '../api/_utils/constants';

export default function ScholarDashboard({ user }) {
  const [app, setApp] = useState(null);
  const [found, setFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Steps: 1: Personal, 2: Education, 3: Family, 4: Special/Leadership, 5: Uploads
  const [step, setStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    semesterSy: 'S.Y. 2026-2027 1st Semester',
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: '',
    dateOfBirth: '',
    sex: 'Male',
    civilStatus: 'Single',
    contactNumber: '',
    address: '',
    barangay: user?.barangay || BARANGAYS[0],
    email: '',
    schoolEnrolled: '',
    courseProgram: '',
    yearLevel: '1st Year',
    studentIdNo: '',
    gwa: '',
    gwaScale: '100',
    q1Grade: '',
    q2Grade: '',
    q3Grade: '',
    q4Grade: '',
    parentGuardianName: '',
    relationship: '',
    parentContact: '',
    monthlyIncome: '',
    numDependents: '1',
    sourceOfIncome: '',
    isSoloParentBeneficiary: false,
    isOrphan: false,
    isPwd: false,
    isIp: false,
    isOutOfSchoolYouth: false,
    isMarginalized: false,
    specialCircumstancesSpecify: '',
    leadershipActivities: ''
  });

  // Files State
  const [files, setFiles] = useState({
    letterToMayor: null,
    validId: null,
    enrollmentCert: null,
    gradeTranscript: null,
    barangayClearance: null,
    specialId: null
  });

  useEffect(() => {
    fetchApplication();
  }, []);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scholar/getApplication');
      const data = await res.json();
      if (data.found) {
        setApp(data.application);
        setFound(true);
      } else {
        setFound(false);
      }
    } catch (err) {
      console.error('Failed to load application:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate GWA average from quarterly inputs if selected
  const handleCalcGWA = () => {
    const q1 = parseFloat(formData.q1Grade);
    const q2 = parseFloat(formData.q2Grade);
    const q3 = parseFloat(formData.q3Grade);
    const q4 = parseFloat(formData.q4Grade);

    if (!isNaN(q1) && !isNaN(q2) && !isNaN(q3) && !isNaN(q4)) {
      const avg = (q1 + q2 + q3 + q4) / 4;
      setFormData(prev => ({ ...prev, gwa: avg.toFixed(2) }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Only PDF documents are supported.');
        e.target.value = null;
        return;
      }
      setFiles(prev => ({ ...prev, [key]: file }));
    }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    // Validate uploads for first submission
    if (!found) {
      if (!files.letterToMayor || !files.validId || !files.enrollmentCert || !files.gradeTranscript || !files.barangayClearance) {
        setError('Please upload all 5 required documents.');
        setSubmitting(false);
        return;
      }
    }

    try {
      const payload = { ...formData };

      // Convert files concurrently
      const fileKeys = ['letterToMayor', 'validId', 'enrollmentCert', 'gradeTranscript', 'barangayClearance', 'specialId'];
      for (const key of fileKeys) {
        const file = files[key];
        if (file) {
          const base64 = await fileToBase64(file);
          payload[`${key}File`] = {
            fileData: base64,
            fileName: file.name,
            mimeType: file.type
          };
        }
      }

      const res = await fetch('/api/scholar/submitApplication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');

      setSuccess(data.message);
      setIsEditing(false);
      setTimeout(() => {
        fetchApplication();
        setStep(1);
        setSuccess('');
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <svg className="animate-spin h-10 w-10 text-gold" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-white/60 text-sm">Loading application data...</span>
      </div>
    );
  }

  // STATUS VIEW (If applied and not currently editing)
  if (found && !isEditing) {
    const statusColors = {
      'Pending': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      'Under Evaluation': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'Approved': 'bg-green-500/10 text-green-400 border-green-500/30',
      'Rejected': 'bg-red-500/10 text-red-400 border-red-500/30'
    };

    const ratingTiers = (score) => {
      if (score >= 90) return { label: 'Highly Qualified', color: 'text-green-400' };
      if (score >= 80) return { label: 'Qualified', color: 'text-gold' };
      if (score >= 70) return { label: 'Moderately Qualified', color: 'text-yellow-400' };
      return { label: 'Needs Further Evaluation', color: 'text-red-400' };
    };

    return (
      <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
        {/* Top Banner and Financial Summary Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Status Dashboard Banner */}
          <div className="xl:col-span-2 glass-panel rounded-2xl p-6 md:p-8 border border-gold/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">Application Status</span>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-full border text-sm font-bold uppercase tracking-wider ${statusColors[app.status]}`}>
                  {app.status}
                </span>
                {app.status === 'Approved' && (
                  <span className="text-sm font-bold text-gold-gradient animate-bounce">
                    ✨ Approved Scholar
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">Submitted on: {new Date(app.date_filed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>

            <button
              onClick={() => {
                setFormData({
                  semesterSy: app.semester_sy,
                  lastName: app.last_name,
                  firstName: app.first_name,
                  middleName: app.middle_name || '',
                  suffix: app.suffix || '',
                  dateOfBirth: app.date_of_birth ? app.date_of_birth.substring(0, 10) : '',
                  sex: app.sex,
                  civilStatus: app.civil_status,
                  contactNumber: app.contact_number,
                  address: app.address,
                  barangay: app.barangay,
                  email: app.email,
                  schoolEnrolled: app.school_enrolled,
                  courseProgram: app.course_program,
                  yearLevel: app.year_level,
                  studentIdNo: app.student_id_no || '',
                  gwa: app.gwa,
                  gwaScale: app.gwa_scale || '100',
                  q1Grade: app.q1_grade || '',
                  q2Grade: app.q2_grade || '',
                  q3Grade: app.q3_grade || '',
                  q4Grade: app.q4_grade || '',
                  parentGuardianName: app.parent_guardian_name,
                  relationship: app.relationship,
                  parentContact: app.parent_contact,
                  monthlyIncome: app.monthly_income,
                  numDependents: app.num_dependents.toString(),
                  sourceOfIncome: app.source_of_income,
                  isSoloParentBeneficiary: !!app.is_solo_parent_beneficiary,
                  isOrphan: !!app.is_orphan,
                  isPwd: !!app.is_pwd,
                  isIp: !!app.is_ip,
                  isOutOfSchoolYouth: !!app.is_out_of_school_youth,
                  isMarginalized: !!app.is_marginalized,
                  specialCircumstancesSpecify: app.special_circumstances_specify || '',
                  leadershipActivities: app.leadership_activities || ''
                });
                setIsEditing(true);
              }}
              className="px-5 py-3 rounded-lg border border-gold/30 hover:bg-gold/10 text-gold text-xs font-bold uppercase tracking-wider transition-all cursor-pointer w-full sm:w-auto text-center"
            >
              Update / Edit Form
            </button>
          </div>

          {/* Financial Grant Summary Card */}
          <div className="glass-panel rounded-2xl p-6 border border-gold/20 bg-gold/5 flex flex-col justify-between gap-4">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">Financial Grant Summary</span>
                <h4 className="text-lg font-bold text-gold-gradient">Palayan Youth Assistance</h4>
              </div>
              <div className="p-2 bg-gold/15 rounded-lg border border-gold/30">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-white/5 pt-3">
              <div>
                <span className="text-white/40 text-[9px] uppercase font-semibold">Scholarship Budget Allocation</span>
                <p className="text-2xl font-extrabold text-white mt-0.5">₱2,500.00 <span className="text-xs font-normal text-white/50">/ term</span></p>
              </div>
              <div className="text-right">
                <span className="text-white/40 text-[9px] uppercase font-semibold">Annual Assistance Fund</span>
                <p className="text-sm font-bold text-gold mt-0.5">₱600,000.00</p>
              </div>
            </div>

            <div className="text-[10px] text-white/50 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {app.status === 'Approved' 
                  ? 'Disbursement active for current semester.' 
                  : 'Grant allocation reserved pending approval.'}
              </span>
            </div>
          </div>
        </div>

        {/* Evaluation Scores (If Graded) */}
        {(app.status === 'Approved' || app.status === 'Rejected' || app.score_total > 0) && (
          <div className="glass-panel border-l-4 border-gold rounded-xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gold-gradient">Official Assessment Scoreboard</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">Academic (30%)</span>
                <p className="text-xl font-bold mt-1">{app.score_academic} pts</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">Socio-Economic (30%)</span>
                <p className="text-xl font-bold mt-1">{app.score_socio_economic} pts</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">Leadership (15%)</span>
                <p className="text-xl font-bold mt-1">{app.score_leadership} pts</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">Interview (15%)</span>
                <p className="text-xl font-bold mt-1">{app.score_interview} pts</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center col-span-2 sm:col-span-1">
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">Special (10%)</span>
                <p className="text-xl font-bold mt-1">{app.score_special_circumstances} pts</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/5 border border-white/10 rounded-lg mt-2 gap-4">
              <div>
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider">Cumulative Raw Score</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-gold">{app.score_total} / 100</span>
                  <span className={`text-sm font-bold ${ratingTiers(app.score_total).color}`}>
                    ({ratingTiers(app.score_total).label})
                  </span>
                </div>
              </div>
              {app.evaluator_remarks && (
                <div className="sm:border-l border-white/10 sm:pl-6 max-w-md">
                  <span className="text-white/50 text-xs uppercase font-bold tracking-wider">Evaluator Remarks</span>
                  <p className="text-sm italic text-white/80 mt-1">"{app.evaluator_remarks}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Application Dossier */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Personal Profile */}
          <div className="glass-panel rounded-xl p-6 border border-white/5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gold border-b border-white/10 pb-2 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              1. Personal Profile
            </h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div>
                <p className="text-white/40 font-semibold">Full Name</p>
                <p className="font-bold text-white mt-0.5 truncate">{app.first_name} {app.middle_name} {app.last_name} {app.suffix}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Date of Birth</p>
                <p className="font-bold text-white mt-0.5">{app.date_of_birth ? new Date(app.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Sex / Gender</p>
                <p className="font-bold text-white mt-0.5">{app.sex}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Civil Status</p>
                <p className="font-bold text-white mt-0.5">{app.civil_status}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Contact Number</p>
                <p className="font-bold text-white mt-0.5">{app.contact_number}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Email Address</p>
                <p className="font-bold text-white mt-0.5 truncate">{app.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-white/40 font-semibold">Registered Barangay</p>
                <p className="font-bold text-gold mt-0.5">{app.barangay}</p>
              </div>
              <div className="col-span-2">
                <p className="text-white/40 font-semibold">Residential Address</p>
                <p className="font-bold text-white/80 mt-0.5 leading-relaxed">{app.address}</p>
              </div>
            </div>
          </div>

          {/* Panel 2: Academic Profile */}
          <div className="glass-panel rounded-xl p-6 border border-white/5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gold border-b border-white/10 pb-2 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              2. Academic Profile
            </h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div className="col-span-2">
                <p className="text-white/40 font-semibold">School Enrolled</p>
                <p className="font-bold text-white mt-0.5 truncate" title={app.school_enrolled}>{app.school_enrolled}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Course / Program</p>
                <p className="font-bold text-white mt-0.5 truncate" title={app.course_program}>{app.course_program}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Year Level</p>
                <p className="font-bold text-white mt-0.5">{app.year_level}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Student ID Number</p>
                <p className="font-bold text-white mt-0.5 font-mono">{app.student_id_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">General Weighted Average (GWA)</p>
                <p className="font-bold text-gold mt-0.5">{app.gwa} <span className="text-[10px] text-white/40 font-normal">({app.gwa_scale === '5' ? '1.0-5.0 scale' : '100-pt scale'})</span></p>
              </div>

              {/* Quarterly grades breakdown if available */}
              {(app.q1_grade || app.q2_grade || app.q3_grade || app.q4_grade) && (
                <div className="col-span-2 bg-white/5 border border-white/10 rounded-lg p-2.5 mt-1">
                  <p className="text-white/40 text-[9px] uppercase font-bold tracking-wider mb-2">Quarterly Grades Breakdown</p>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-white/90">
                    <div className="bg-white/5 py-1 rounded">
                      <span className="text-white/40 block text-[8px] uppercase">Q1</span>
                      {app.q1_grade || '—'}
                    </div>
                    <div className="bg-white/5 py-1 rounded">
                      <span className="text-white/40 block text-[8px] uppercase">Q2</span>
                      {app.q2_grade || '—'}
                    </div>
                    <div className="bg-white/5 py-1 rounded">
                      <span className="text-white/40 block text-[8px] uppercase">Q3</span>
                      {app.q3_grade || '—'}
                    </div>
                    <div className="bg-white/5 py-1 rounded">
                      <span className="text-white/40 block text-[8px] uppercase">Q4</span>
                      {app.q4_grade || '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel 3: Household & Socio-Economic */}
          <div className="glass-panel rounded-xl p-6 border border-white/5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gold border-b border-white/10 pb-2 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              3. Family & Household Profile
            </h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div>
                <p className="text-white/40 font-semibold">Parent / Guardian Name</p>
                <p className="font-bold text-white mt-0.5 truncate">{app.parent_guardian_name}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Relationship</p>
                <p className="font-bold text-white mt-0.5">{app.relationship}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Parent Contact Number</p>
                <p className="font-bold text-white mt-0.5">{app.parent_contact}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Monthly Household Income</p>
                <p className="font-bold text-gold mt-0.5">₱{parseFloat(app.monthly_income).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Number of Dependents</p>
                <p className="font-bold text-white mt-0.5">{app.num_dependents}</p>
              </div>
              <div>
                <p className="text-white/40 font-semibold">Source of Income</p>
                <p className="font-bold text-white mt-0.5 truncate" title={app.source_of_income}>{app.source_of_income}</p>
              </div>
            </div>
          </div>

          {/* Panel 4: Special Circumstances & Leadership */}
          <div className="glass-panel rounded-xl p-6 border border-white/5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gold border-b border-white/10 pb-2 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              4. Sectoral Context & Leadership
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <p className="text-white/40 font-semibold mb-1.5">Special Circumstances / Vulnerabilities</p>
                <div className="flex flex-wrap gap-1.5">
                  {app.is_solo_parent_beneficiary && <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 text-[10px] font-medium">Solo Parent Beneficiary</span>}
                  {app.is_orphan && <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 text-[10px] font-medium">Orphan</span>}
                  {app.is_pwd && <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 text-[10px] font-medium">PWD</span>}
                  {app.is_ip && <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 text-[10px] font-medium">Indigenous People (IP)</span>}
                  {app.is_out_of_school_youth && <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 text-[10px] font-medium">OSY Returnee</span>}
                  {app.is_marginalized && <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 text-[10px] font-medium">Marginalized Sector</span>}
                  {!app.is_solo_parent_beneficiary && !app.is_orphan && !app.is_pwd && !app.is_ip && !app.is_out_of_school_youth && !app.is_marginalized && (
                    <span className="text-white/45 italic text-[11px]">None declared</span>
                  )}
                </div>
                {app.special_circumstances_specify && (
                  <p className="text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-lg p-2 mt-2 leading-relaxed italic">
                    "{app.special_circumstances_specify}"
                  </p>
                )}
              </div>
              <div className="border-t border-white/5 pt-3">
                <p className="text-white/40 font-semibold mb-1">Leadership Involvements & Activities</p>
                <p className="text-white/80 leading-relaxed font-medium bg-white/5 border border-white/10 rounded-lg p-2.5 text-[11px] whitespace-pre-line max-h-32 overflow-y-auto">
                  {app.leadership_activities || 'No extra-curricular involvements declared.'}
                </p>
              </div>
            </div>
          </div>

          {/* Documentary Requirements Links */}
          <div className="glass-panel rounded-xl p-6 border border-white/5 lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gold border-b border-white/10 pb-2 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              5. Submitted Documentary Verification (PDFs)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {app.letter_to_mayor_url && (
                <a href={app.letter_to_mayor_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 hover:border-gold/30 hover:bg-white/10 rounded-lg text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer">
                  <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="truncate">Letter to City Mayor</span>
                </a>
              )}
              {app.valid_id_url && (
                <a href={app.valid_id_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 hover:border-gold/30 hover:bg-white/10 rounded-lg text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer">
                  <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="truncate">Student Valid ID</span>
                </a>
              )}
              {app.enrollment_cert_url && (
                <a href={app.enrollment_cert_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 hover:border-gold/30 hover:bg-white/10 rounded-lg text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer">
                  <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="truncate">Certificate of Enrollment</span>
                </a>
              )}
              {app.grade_transcript_url && (
                <a href={app.grade_transcript_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 hover:border-gold/30 hover:bg-white/10 rounded-lg text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer">
                  <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="truncate">Latest Grade Transcript</span>
                </a>
              )}
              {app.barangay_clearance_url && (
                <a href={app.barangay_clearance_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 hover:border-gold/30 hover:bg-white/10 rounded-lg text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer">
                  <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="truncate">Barangay Clearance</span>
                </a>
              )}
              {app.special_id_url && (
                <a href={app.special_id_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 hover:border-gold/30 hover:bg-white/10 rounded-lg text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer">
                  <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="truncate">PWD / IP / Solo Parent ID</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WIZARD FORM VIEW (If not submitted yet, or editing)
  return (
    <div className="glass-panel border border-gold/15 rounded-2xl w-full flex flex-col p-6 md:p-8 gap-6 relative">
      {/* Form Title */}
      <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gold-gradient">Financial Assistance Program Application</h2>
          <p className="text-xs text-white/50 mt-1">LYDC Resolution No. 5, Series of 2026</p>
        </div>
        {isEditing && (
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 rounded bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* Steps Indicators */}
      <div className="flex justify-between items-center gap-2 max-w-xl mx-auto w-full text-xs font-semibold text-white/50 select-none">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
              step === s
                ? 'bg-gold-gradient text-forest-dark border-gold font-bold shadow-md'
                : step > s
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'border-white/10'
            }`}>
              {s}
            </span>
            <span className={`hidden sm:inline ${step === s ? 'text-gold font-bold' : ''}`}>
              {s === 1 ? 'Personal' : s === 2 ? 'Education' : s === 3 ? 'Family' : s === 4 ? 'Details' : 'Uploads'}
            </span>
            {s < 5 && <div className="h-[1px] w-4 sm:w-10 bg-white/10" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* STEP 1: PERSONAL INFORMATION */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <h3 className="text-sm font-bold text-gold/80 uppercase tracking-widest border-b border-white/5 pb-1">I. Personal Information</h3>
            </div>
            <div className="flex flex-col">
              <label className="input-label">Last Name *</label>
              <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">First Name *</label>
              <input type="text" name="firstName" required value={formData.firstName} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Middle Name</label>
              <input type="text" name="middleName" value={formData.middleName} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Suffix (Jr/III)</label>
              <input type="text" name="suffix" value={formData.suffix} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Date of Birth *</label>
              <input type="date" name="dateOfBirth" required value={formData.dateOfBirth} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Sex *</label>
              <select name="sex" value={formData.sex} onChange={handleInputChange} className="input-field text-sm cursor-pointer">
                <option value="Male" className="bg-forest-dark text-white">Male</option>
                <option value="Female" className="bg-forest-dark text-white">Female</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="input-label">Civil Status *</label>
              <select name="civilStatus" value={formData.civilStatus} onChange={handleInputChange} className="input-field text-sm cursor-pointer">
                <option value="Single" className="bg-forest-dark text-white">Single</option>
                <option value="Married" className="bg-forest-dark text-white">Married</option>
                <option value="Separated" className="bg-forest-dark text-white">Separated</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="input-label">Contact Number *</label>
              <input type="tel" name="contactNumber" required placeholder="09xxxxxxxxx" value={formData.contactNumber} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Email Address *</label>
              <input type="email" name="email" required placeholder="name@email.com" value={formData.email} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col md:col-span-2">
              <label className="input-label">Barangay Address *</label>
              <select name="barangay" value={formData.barangay} onChange={handleInputChange} className="input-field text-sm cursor-pointer">
                {BARANGAYS.map(b => (
                  <option key={b} value={b} className="bg-forest-dark text-white">{b}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col md:col-span-3">
              <label className="input-label">Street / House Number Address *</label>
              <input type="text" name="address" required placeholder="Purok, Street, Barangay, Palayan City" value={formData.address} onChange={handleInputChange} className="input-field text-sm" />
            </div>
          </div>
        )}

        {/* STEP 2: EDUCATIONAL BACKGROUND */}
        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gold/80 uppercase tracking-widest border-b border-white/5 pb-1">II. Educational Background</h3>
            </div>
            <div className="flex flex-col">
              <label className="input-label">School / Institution Currently Enrolled *</label>
              <input type="text" name="schoolEnrolled" required value={formData.schoolEnrolled} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Course / Program *</label>
              <input type="text" name="courseProgram" required placeholder="e.g. BS in Information Technology" value={formData.courseProgram} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Year Level *</label>
              <select name="yearLevel" value={formData.yearLevel} onChange={handleInputChange} className="input-field text-sm cursor-pointer">
                <option value="1st Year" className="bg-forest-dark text-white">1st Year</option>
                <option value="2nd Year" className="bg-forest-dark text-white">2nd Year</option>
                <option value="3rd Year" className="bg-forest-dark text-white">3rd Year</option>
                <option value="4th Year" className="bg-forest-dark text-white">4th Year</option>
                <option value="5th Year" className="bg-forest-dark text-white">5th Year</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="input-label">Student ID No.</label>
              <input type="text" name="studentIdNo" value={formData.studentIdNo} onChange={handleInputChange} className="input-field text-sm" />
            </div>

            {/* GWA inputs */}
            <div className="glass-card border border-white/10 rounded-xl p-5 md:col-span-2 flex flex-col gap-4 mt-2">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-gold uppercase tracking-wider">Quarterly Grades & GWA Calculator</span>
                <select name="gwaScale" value={formData.gwaScale} onChange={handleInputChange} className="input-field text-xs py-1 px-2">
                  <option value="100" className="bg-forest-dark text-white">100-point scale</option>
                  <option value="5" className="bg-forest-dark text-white">1.00-5.00 scale</option>
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <label className="input-label text-[11px]">1st Quarter Grade</label>
                  <input type="number" step="0.01" name="q1Grade" placeholder="Q1" value={formData.q1Grade} onChange={handleInputChange} className="input-field text-xs" />
                </div>
                <div className="flex flex-col">
                  <label className="input-label text-[11px]">2nd Quarter Grade</label>
                  <input type="number" step="0.01" name="q2Grade" placeholder="Q2" value={formData.q2Grade} onChange={handleInputChange} className="input-field text-xs" />
                </div>
                <div className="flex flex-col">
                  <label className="input-label text-[11px]">3rd Quarter Grade</label>
                  <input type="number" step="0.01" name="q3Grade" placeholder="Q3" value={formData.q3Grade} onChange={handleInputChange} className="input-field text-xs" />
                </div>
                <div className="flex flex-col">
                  <label className="input-label text-[11px]">4th Quarter Grade</label>
                  <input type="number" step="0.01" name="q4Grade" placeholder="Q4" value={formData.q4Grade} onChange={handleInputChange} className="input-field text-xs" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
                <button
                  type="button"
                  onClick={handleCalcGWA}
                  className="px-4 py-2 rounded bg-gold/10 hover:bg-gold/20 text-gold text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Calculate GWA Average
                </button>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-white">Final GWA: *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="gwa"
                    required
                    placeholder="Enter GWA"
                    value={formData.gwa}
                    onChange={handleInputChange}
                    className="input-field text-sm font-bold text-gold max-w-[120px] text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FAMILY & SOCIO-ECONOMIC BACKGROUND */}
        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gold/80 uppercase tracking-widest border-b border-white/5 pb-1">III. Family & Socio-Economic Background</h3>
            </div>
            <div className="flex flex-col">
              <label className="input-label">Name of Parent / Guardian *</label>
              <input type="text" name="parentGuardianName" required value={formData.parentGuardianName} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Relationship *</label>
              <input type="text" name="relationship" required placeholder="e.g. Mother, Uncle" value={formData.relationship} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Parent/Guardian Contact No. *</label>
              <input type="tel" name="parentContact" required value={formData.parentContact} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Monthly Family Income (Php) *</label>
              <input type="number" name="monthlyIncome" required placeholder="Php" value={formData.monthlyIncome} onChange={handleInputChange} className="input-field text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Number of Dependents *</label>
              <input type="number" name="numDependents" required value={formData.numDependents} onChange={handleInputChange} className="input-field text-sm" min="1" />
            </div>
            <div className="flex flex-col">
              <label className="input-label">Source of Income *</label>
              <input type="text" name="sourceOfIncome" required placeholder="e.g. Farming, Office Employee" value={formData.sourceOfIncome} onChange={handleInputChange} className="input-field text-sm" />
            </div>
          </div>
        )}

        {/* STEP 4: SPECIAL CIRCUMSTANCES & LEADERSHIP */}
        {step === 4 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Special Circumstances */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gold/80 uppercase tracking-widest border-b border-white/5 pb-1">IV. Special Circumstances</h3>
              <div className="flex flex-col gap-2.5 text-sm">
                <label className="flex items-center gap-3 cursor-pointer text-white/80 hover:text-white">
                  <input type="checkbox" name="isSoloParentBeneficiary" checked={formData.isSoloParentBeneficiary} onChange={handleInputChange} className="rounded border-white/20 text-gold bg-white/5 w-4 h-4" />
                  Solo Parent Beneficiary
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-white/80 hover:text-white">
                  <input type="checkbox" name="isOrphan" checked={formData.isOrphan} onChange={handleInputChange} className="rounded border-white/20 text-gold bg-white/5 w-4 h-4" />
                  Orphan
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-white/80 hover:text-white">
                  <input type="checkbox" name="isPwd" checked={formData.isPwd} onChange={handleInputChange} className="rounded border-white/20 text-gold bg-white/5 w-4 h-4" />
                  Person with Disability (PWD)
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-white/80 hover:text-white">
                  <input type="checkbox" name="isIp" checked={formData.isIp} onChange={handleInputChange} className="rounded border-white/20 text-gold bg-white/5 w-4 h-4" />
                  Indigenous People (IP)
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-white/80 hover:text-white">
                  <input type="checkbox" name="isOutOfSchoolYouth" checked={formData.isOutOfSchoolYouth} onChange={handleInputChange} className="rounded border-white/20 text-gold bg-white/5 w-4 h-4" />
                  Out-of-School Youth Returnee
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-white/80 hover:text-white">
                  <input type="checkbox" name="isMarginalized" checked={formData.isMarginalized} onChange={handleInputChange} className="rounded border-white/20 text-gold bg-white/5 w-4 h-4" />
                  Marginalized / Vulnerable Sector
                </label>
              </div>

              <div className="flex flex-col mt-2">
                <label className="input-label">If applicable, please specify:</label>
                <textarea name="specialCircumstancesSpecify" rows="2" value={formData.specialCircumstancesSpecify} onChange={handleInputChange} className="input-field text-sm" />
              </div>
            </div>

            {/* Leadership Involvements */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gold/80 uppercase tracking-widest border-b border-white/5 pb-1">V. Leadership & Community Involvement</h3>
              <div className="flex flex-col">
                <label className="input-label">Organizations / Activities / Positions Held:</label>
                <textarea
                  name="leadershipActivities"
                  rows="8"
                  placeholder="Organizations, youth groups, or community involvements you participate in..."
                  value={formData.leadershipActivities}
                  onChange={handleInputChange}
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: DOCUMENTARY REQUIREMENTS */}
        {step === 5 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gold/80 uppercase tracking-widest border-b border-white/5 pb-1">Documentary Requirements (PDF Only)</h3>
              <p className="text-xs text-white/50 mt-1">Please upload the required files. Submitting will reset your application to Pending.</p>
            </div>

            <div className="flex flex-col p-4 bg-white/5 border border-white/10 rounded-xl">
              <label className="input-label font-bold text-white">Letter to City Mayor *</label>
              <input type="file" accept=".pdf" onChange={e => handleFileChange(e, 'letterToMayor')} className="text-xs mt-2 text-white/70" required={!found} />
              {app?.letter_to_mayor_url && <span className="text-[10px] text-green-400 mt-2">✓ Previously uploaded file exists</span>}
            </div>

            <div className="flex flex-col p-4 bg-white/5 border border-white/10 rounded-xl">
              <label className="input-label font-bold text-white">Student Valid ID *</label>
              <input type="file" accept=".pdf" onChange={e => handleFileChange(e, 'validId')} className="text-xs mt-2 text-white/70" required={!found} />
              {app?.valid_id_url && <span className="text-[10px] text-green-400 mt-2">✓ Previously uploaded file exists</span>}
            </div>

            <div className="flex flex-col p-4 bg-white/5 border border-white/10 rounded-xl">
              <label className="input-label font-bold text-white">Certificate of Enrollment *</label>
              <input type="file" accept=".pdf" onChange={e => handleFileChange(e, 'enrollmentCert')} className="text-xs mt-2 text-white/70" required={!found} />
              {app?.enrollment_cert_url && <span className="text-[10px] text-green-400 mt-2">✓ Previously uploaded file exists</span>}
            </div>

            <div className="flex flex-col p-4 bg-white/5 border border-white/10 rounded-xl">
              <label className="input-label font-bold text-white">Latest Grade Transcript / Report Card *</label>
              <input type="file" accept=".pdf" onChange={e => handleFileChange(e, 'gradeTranscript')} className="text-xs mt-2 text-white/70" required={!found} />
              {app?.grade_transcript_url && <span className="text-[10px] text-green-400 mt-2">✓ Previously uploaded file exists</span>}
            </div>

            <div className="flex flex-col p-4 bg-white/5 border border-white/10 rounded-xl">
              <label className="input-label font-bold text-white">Barangay Clearance *</label>
              <input type="file" accept=".pdf" onChange={e => handleFileChange(e, 'barangayClearance')} className="text-xs mt-2 text-white/70" required={!found} />
              {app?.barangay_clearance_url && <span className="text-[10px] text-green-400 mt-2">✓ Previously uploaded file exists</span>}
            </div>

            <div className="flex flex-col p-4 bg-white/5 border border-white/10 rounded-xl">
              <label className="input-label font-bold text-white">PWD / IP / Solo Parent ID (If applicable)</label>
              <input type="file" accept=".pdf" onChange={e => handleFileChange(e, 'specialId')} className="text-xs mt-2 text-white/70" />
              {app?.special_id_url && <span className="text-[10px] text-green-400 mt-2">✓ Previously uploaded file exists</span>}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center border-t border-white/10 pt-6 mt-4">
          <button
            type="button"
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            disabled={step === 1 || submitting}
            className="px-5 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-white/80 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold uppercase transition-all cursor-pointer"
          >
            Back
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(prev => Math.min(5, prev + 1))}
              className="px-5 py-3 rounded-lg bg-gold-gradient text-forest-dark font-bold text-xs uppercase tracking-wider transition-all cursor-pointer glow-btn"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-lg bg-gold-gradient text-forest-dark font-bold text-xs uppercase tracking-wider transition-all cursor-pointer glow-btn disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-forest-dark" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading Application...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
