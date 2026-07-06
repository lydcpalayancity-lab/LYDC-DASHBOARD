'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import KpiCards from './components/KpiCards';
import DocumentTable from './components/DocumentTable';
import ScholarRegistrationModal from './components/ScholarRegistrationModal';
import ScholarDashboard from './components/ScholarDashboard';
import AdminScholarTracker from './components/AdminScholarTracker';
import AnalyticsTab from './components/AnalyticsTab';
import { BARANGAYS, LYDC_CENTERS } from './api/_utils/constants';

export default function Page() {
  // Safe date formatter to prevent client-side crashes
  const formatSafeDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Session & Authentication
  const [user, setUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  // Login States
  const [portalMode, setPortalMode] = useState(null); // 'officer' or 'scholar'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('home');

  // Shared Data States
  const [analytics, setAnalytics] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState('Atate');
  const [pendingDocs, setPendingDocs] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [concernsList, setConcernsList] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Uploader Form States
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('Minutes of Meeting');
  const [uploadSubCat, setUploadSubCat] = useState('Atate');
  const [uploadUserType, setUploadUserType] = useState('SK');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ text: '', isError: false });

  // Admin Manage Deadlines Form States
  const [dlTitle, setDlTitle] = useState('');
  const [dlDate, setDlDate] = useState('');
  const [dlTargetRole, setDlTargetRole] = useState('all');

  // Report Concern States
  const [isConcernOpen, setIsConcernOpen] = useState(false);
  const [concernCategory, setConcernCategory] = useState('General Concern');
  const [concernDescription, setConcernDescription] = useState('');
  const [concernLoading, setConcernLoading] = useState(false);
  const [concernMsg, setConcernMsg] = useState({ text: '', isError: false });
  const [dlSaving, setDlSaving] = useState(false);

  // Admin Manage Accounts Form States
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState('SK');
  const [newBarangay, setNewBarangay] = useState(BARANGAYS[0]);
  const [acctMsg, setAcctMsg] = useState({ text: '', isError: false });
  const [acctLoading, setAcctLoading] = useState(false);

  // Categories list for uploader
  const DOCUMENT_CATEGORIES = [
    'Minutes of Meeting', 'Financial Report', 'Accomplishment Report', 
    'Project Proposal', 'Resolution', 'GIS Output', 'Other Official Records'
  ];

  // 1. Session Verification
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/checkSession');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        // Default tab selection
        if (data.user.role === 'scholar') {
          setActiveTab('dashboard');
        } else {
          setActiveTab('home');
          // Bind default sub-category for officers
          if (data.user.role === 'SK') {
            setSelectedEntity(data.user.barangay);
            setUploadSubCat(data.user.barangay);
            setUploadUserType('SK');
          } else if (data.user.role === 'LYDC') {
            setSelectedEntity(data.user.barangay);
            setUploadSubCat(data.user.barangay);
            setUploadUserType('LYDC');
          }
        }
      }
    } catch (err) {
      console.error('Session verify failed:', err);
    } finally {
      setSessionChecked(true);
    }
  };

  // 2. Fetch Tab Specific Data
  useEffect(() => {
    if (!user) return;

    if (user.role !== 'scholar') {
      if (activeTab === 'home') {
        fetchAnalytics();
        fetchDocuments(selectedEntity);
      } else if (activeTab === 'pending' && user.role === 'admin') {
        fetchPendingDocs();
      } else if (activeTab === 'deadlines') {
        fetchDeadlines();
      } else if (activeTab === 'concerns' && user.role === 'admin') {
        fetchConcerns();
      } else if (activeTab === 'accounts' && user.role === 'admin') {
        fetchUsers();
        fetchAuditLogs();
      }
    } else {
      if (activeTab === 'deadlines') {
        fetchDeadlines();
      }
    }
  }, [user, activeTab, selectedEntity]);

  const fetchAnalytics = async () => {
    if (user.role !== 'admin') return;
    try {
      const res = await fetch('/api/getGlobalAnalyticsData');
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error('Analytics load error:', err);
    }
  };

  const fetchDocuments = async (entity) => {
    setDataLoading(true);
    try {
      const res = await fetch(`/api/getDocuments?entity=${encodeURIComponent(entity)}`);
      const data = await res.json();
      if (res.ok) {
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchPendingDocs = async () => {
    try {
      const res = await fetch('/api/getPendingApprovals');
      const data = await res.json();
      if (res.ok) setPendingDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Pending load error:', err);
    }
  };

  const fetchDeadlines = async () => {
    try {
      const res = await fetch('/api/getDeadlines');
      const data = await res.json();
      if (res.ok) setDeadlines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Deadlines load error:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/listUsers');
      const data = await res.json();
      if (res.ok) setUsersList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Users load error:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/getAuditLogs');
      const data = await res.json();
      if (res.ok) setAuditLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Audit logs load error:', err);
    }
  };

  const fetchConcerns = async () => {
    try {
      const res = await fetch('/api/admin/getConcerns');
      const data = await res.json();
      if (res.ok) setConcernsList(Array.isArray(data) ? data : data.rows || []);
    } catch (err) {
      console.error('Failed to load concerns:', err);
    }
  };

  const handleUpdateConcernStatus = async (id, status) => {
    try {
      const res = await fetch('/api/admin/updateConcernStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        fetchConcerns();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Failed to update concern status:', err);
    }
  };

  // 3. User Authentication
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      setUser(data.user);
      setUsername('');
      setPassword('');

      // Enforce default routing
      if (data.user.role === 'scholar') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('home');
        if (data.user.role === 'SK' || data.user.role === 'LYDC') {
          setSelectedEntity(data.user.barangay);
          setUploadSubCat(data.user.barangay);
          setUploadUserType(data.user.role);
        }
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setUser(null);
      setPortalMode(null);
      setAnalytics(null);
      setDocuments([]);
      setPendingDocs([]);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // 4. File Uploader Form
  const handleFileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadMsg({ text: '', isError: false });
    if (!uploadFile) {
      setUploadMsg({ text: 'Please attach a document file.', isError: true });
      return;
    }

    setUploadLoading(true);
    try {
      const base64 = await handleFileToBase64(uploadFile);
      const res = await fetch('/api/processForm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64,
          fileName: uploadFile.name,
          mimeType: uploadFile.type,
          category: uploadCategory,
          subCategory: user.role === 'admin' ? uploadSubCat : user.barangay,
          userType: user.role === 'admin' ? uploadUserType : user.role
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed.');

      setUploadMsg({ text: data.message, isError: false });
      setUploadFile(null);
      // Reset input element
      e.target.reset();
      
      // Refresh documents
      fetchDocuments(selectedEntity);
      if (user.role === 'admin') fetchAnalytics();
    } catch (err) {
      setUploadMsg({ text: err.message, isError: true });
    } finally {
      setUploadLoading(false);
    }
  };

  // 5. Admin Approve / Reject actions
  const handleApproveDoc = async (fileId) => {
    try {
      const res = await fetch('/api/approveDocument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      });
      if (res.ok) {
        fetchPendingDocs();
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleRejectDoc = async (fileId) => {
    if (!confirm('Are you sure you want to reject and delete this document?')) return;
    try {
      const res = await fetch('/api/rejectDocument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      });
      if (res.ok) {
        fetchPendingDocs();
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Reject failed:', err);
    }
  };

  // 6. Admin Add Deadline
  const handleSaveDeadline = async (e) => {
    e.preventDefault();
    setDlSaving(true);
    try {
      const res = await fetch('/api/adminSaveDeadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: dlTitle, date: dlDate, targetRole: dlTargetRole })
      });
      if (res.ok) {
        setDlTitle('');
        setDlDate('');
        setDlTargetRole('all');
        fetchDeadlines();
      }
    } catch (err) {
      console.error('Save deadline error:', err);
    } finally {
      setDlSaving(false);
    }
  };

  const handleDeleteDeadline = async (id) => {
    if (!confirm('Delete this deadline?')) return;
    try {
      const res = await fetch('/api/adminDeleteDeadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchDeadlines();
    } catch (err) {
      console.error('Delete deadline error:', err);
    }
  };

  // 7. Admin Add Account
  const handleAddAccount = async (e) => {
    e.preventDefault();
    setAcctMsg({ text: '', isError: false });
    setAcctLoading(true);
    try {
      const res = await fetch('/api/admin/addUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          barangay: (newRole === 'SK' || newRole === 'scholar') ? newBarangay : null,
          displayName: newDisplayName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user.');

      setAcctMsg({ text: data.message, isError: false });
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      fetchUsers();
    } catch (err) {
      setAcctMsg({ text: err.message, isError: true });
    } finally {
      setAcctLoading(false);
    }
  };

  const handleDeleteAccount = async (targetUsername) => {
    if (!confirm(`Delete user "${targetUsername}" permanently?`)) return;
    try {
      const res = await fetch('/api/admin/removeUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed.');

      alert(data.message);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConcernSubmit = async (e) => {
    e.preventDefault();
    setConcernMsg({ text: '', isError: false });
    setConcernLoading(true);
    try {
      const res = await fetch('/api/submitIssue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: concernCategory, description: concernDescription })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit concern.');

      setConcernMsg({ text: data.message || 'Concern submitted successfully.', isError: false });
      setConcernDescription('');
      setTimeout(() => setIsConcernOpen(false), 1500);
    } catch (err) {
      setConcernMsg({ text: err.message, isError: true });
    } finally {
      setConcernLoading(false);
    }
  };

  // 8. RENDER SCREEN OR GATEWAY
  if (!sessionChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-forest-gradient gap-4">
        <svg className="animate-spin h-10 w-10 text-gold" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-white/60 text-sm font-sans">Connecting to security system...</span>
      </div>
    );
  }

  // GATEWAY & LOGIN RENDER
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-forest-gradient p-4 select-none relative font-sans">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-light/20 rounded-full blur-[150px] pointer-events-none" />

        {/* Portal Gateway Selection */}
        {!portalMode ? (
          <div className="w-full max-w-2xl text-center flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div>
              <div className="w-20 h-20 rounded-full bg-gold-gradient flex items-center justify-center font-bold text-forest-dark text-3xl shadow-xl border border-gold/30 mx-auto mb-4 glow-btn">
                LY
              </div>
              <h1 className="text-4xl font-extrabold text-gold-gradient tracking-tight">Palayan City Youth Portal</h1>
              <p className="text-white/70 text-sm mt-2">Local Youth Development Office Information Management System</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Officer Option */}
              <button
                onClick={() => setPortalMode('officer')}
                className="glass-panel hover:border-gold/50 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all hover:scale-105 group text-white cursor-pointer"
              >
                <div className="p-4 bg-white/5 group-hover:bg-gold/15 rounded-full border border-white/10 group-hover:border-gold/35 shadow-inner transition-all">
                  <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-gold-gradient">Officer / Admin Portal</h3>
                  <p className="text-white/50 text-xs mt-1 max-w-xs">Access for LYDO Staff, Administrators, and Barangay SK Chairpersons</p>
                </div>
              </button>

              {/* Scholar Option */}
              <button
                onClick={() => setPortalMode('scholar')}
                className="glass-panel hover:border-gold/50 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all hover:scale-105 group text-white cursor-pointer"
              >
                <div className="p-4 bg-white/5 group-hover:bg-gold/15 rounded-full border border-white/10 group-hover:border-gold/35 shadow-inner transition-all">
                  <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-gold-gradient">Scholar Gateway</h3>
                  <p className="text-white/50 text-xs mt-1 max-w-xs">Access for student financial assistance applicants and active scholars</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* LOGIN SCREEN */
          <div className="w-full max-w-md glass-panel border border-gold/25 rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Back to modes */}
            <button
              onClick={() => {
                setPortalMode(null);
                setLoginError('');
              }}
              className="absolute top-4 left-4 text-white/50 hover:text-white flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Gateway
            </button>

            {/* Form Header */}
            <div className="px-6 pt-12 pb-6 border-b border-white/10 text-center bg-white/5">
              <h2 className="text-2xl font-bold text-gold-gradient capitalize">{portalMode} Sign In</h2>
              <p className="text-xs text-white/50 mt-1">Please enter your portal access credentials</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="p-6 flex flex-col gap-4">
              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                  {loginError}
                </div>
              )}

              <div className="flex flex-col">
                <label className="input-label">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="input-field text-sm font-mono"
                  disabled={loginLoading}
                />
              </div>

              <div className="flex flex-col">
                <label className="input-label">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field text-sm"
                  disabled={loginLoading}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 py-3 bg-gold-gradient text-forest-dark font-extrabold text-sm rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-lg glow-btn cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? 'Authenticating...' : 'Sign In'}
              </button>

              {portalMode === 'scholar' && (
                <div className="text-center mt-3">
                  <span className="text-xs text-white/50">New applicant? </span>
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(true)}
                    className="text-xs text-gold font-bold hover:underline transition-all cursor-pointer"
                  >
                    Register as Scholar
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Scholar registration modal */}
        {isRegisterOpen && (
          <ScholarRegistrationModal
            isOpen={isRegisterOpen}
            onClose={() => setIsRegisterOpen(false)}
          />
        )}
      </main>
    );
  }

  // 9. LOGGED IN PORTAL RENDER
  const isAdmin = user.role === 'admin';
  const isScholar = user.role === 'scholar';

  return (
    <div className="min-h-screen flex bg-forest-dark text-white font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Workspace Panels */}
      <main className="flex-1 ml-64 p-8 min-h-screen overflow-y-auto flex flex-col gap-8">
        
        {/* TAB 1: HOME (DOCUMENT PORTAL DASHBOARD) */}
        {activeTab === 'home' && user.role !== 'scholar' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h1 className="text-2xl font-extrabold text-gold-gradient uppercase tracking-wider">Document Control Center</h1>
                <p className="text-xs text-white/50">Palayan City Youth Information Management System</p>
              </div>
              
              {/* Category Browser Selector */}
              <div className="flex flex-col gap-1 w-full md:w-auto">
                <span className="text-[10px] text-white/40 uppercase font-semibold">Select Sub-Category Directory</span>
                <select
                  value={selectedEntity}
                  onChange={e => setSelectedEntity(e.target.value)}
                  className="input-field text-xs py-2 px-3 min-w-[200px] cursor-pointer"
                >
                  <optgroup label="Barangays" className="bg-forest-dark text-white font-semibold">
                    {BARANGAYS.map(b => (
                      <option key={b} value={b} className="bg-forest-dark text-white">{b}</option>
                    ))}
                  </optgroup>
                  <optgroup label="LYDC Center Portfolios" className="bg-forest-dark text-white font-semibold">
                    {LYDC_CENTERS.map(c => (
                      <option key={c} value={c} className="bg-forest-dark text-white">{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="LYDO Main" className="bg-forest-dark text-white font-semibold">
                    <option value="LYDO" className="bg-forest-dark text-white">LYDO Office</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* KPI Cards (Admins see real aggregates, SKs see directory stats) */}
            {isAdmin && analytics && <KpiCards data={analytics} />}

            {/* Split layout: Upload Form & Documents Grid */}
            <div className="flex flex-col xl:flex-row gap-8 items-start">
              {/* Uploader Widget */}
              <div className="w-full xl:w-80 shrink-0">
                <div className="glass-panel rounded-xl p-5 border border-gold/15 flex flex-col gap-4">
                  <div>
                    <h3 className="text-md font-bold text-gold-gradient">Submit Document</h3>
                    <p className="text-[10px] text-white/50 mt-0.5">Upload official reports to the folder queue</p>
                  </div>

                  {uploadMsg.text && (
                    <div className={`p-3 text-xs rounded-lg ${uploadMsg.isError ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                      {uploadMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col">
                      <label className="input-label text-[11px]">Document Category</label>
                      <select
                        value={uploadCategory}
                        onChange={e => setUploadCategory(e.target.value)}
                        className="input-field text-xs cursor-pointer"
                      >
                        {DOCUMENT_CATEGORIES.map(cat => (
                          <option key={cat} value={cat} className="bg-forest-dark text-white">{cat}</option>
                        ))}
                      </select>
                    </div>

                    {isAdmin && (
                      <>
                        <div className="flex flex-col">
                          <label className="input-label text-[11px]">Target Folder Directory</label>
                          <select
                            value={uploadSubCat}
                            onChange={e => setUploadSubCat(e.target.value)}
                            className="input-field text-xs cursor-pointer"
                          >
                            <option value="LYDO" className="bg-forest-dark text-white">LYDO Office</option>
                            {BARANGAYS.map(b => (
                              <option key={b} value={b} className="bg-forest-dark text-white">{b}</option>
                            ))}
                            {LYDC_CENTERS.map(c => (
                              <option key={c} value={c} className="bg-forest-dark text-white">{c}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col">
                          <label className="input-label text-[11px]">User Scope Type</label>
                          <select
                            value={uploadUserType}
                            onChange={e => setUploadUserType(e.target.value)}
                            className="input-field text-xs cursor-pointer"
                          >
                            <option value="LYDO" className="bg-forest-dark text-white">LYDO Staff</option>
                            <option value="SK" className="bg-forest-dark text-white">SK Chairperson</option>
                            <option value="LYDC" className="bg-forest-dark text-white">LYDC Center</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="flex flex-col">
                      <label className="input-label text-[11px]">Attach File (PDF Only)</label>
                      <input
                        type="file"
                        accept=".pdf"
                        required
                        onChange={e => setUploadFile(e.target.files[0])}
                        className="text-xs text-white/70"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploadLoading}
                      className="w-full py-3 bg-gold-gradient text-forest-dark font-extrabold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer glow-btn hover:shadow-lg flex items-center justify-center gap-1.5"
                    >
                      {uploadLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-forest-dark" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Processing Upload...
                        </>
                      ) : (
                        'Upload Document'
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 w-full">
                <DocumentTable
                  documents={documents}
                  title={`Folder: ${selectedEntity}`}
                  onRefresh={() => fetchDocuments(selectedEntity)}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 1.5: ANALYTICS DASHBOARD (ADMIN & OFFICERS) */}
        {activeTab === 'analytics' && user && user.role !== 'scholar' && (
          <AnalyticsTab />
        )}

        {/* TAB 2: PENDING APPROVALS QUEUE (ADMIN ONLY) */}
        {activeTab === 'pending' && isAdmin && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-2xl font-extrabold text-gold-gradient uppercase tracking-wider">Verification Queue</h1>
              <p className="text-xs text-white/50">Authorize submitted files before they merge into official folders</p>
            </div>

            <div className="glass-panel rounded-xl p-6 border border-gold/15 w-full">
              {pendingDocs.length === 0 ? (
                <div className="py-16 text-center text-white/30 flex flex-col items-center gap-3">
                  <svg className="w-12 h-12 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Verification queue is empty. No documents are awaiting approval.</span>
                </div>
              ) : (
                <div className="overflow-x-auto w-full border border-white/5 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-gold/80 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-6">Document Name</th>
                        <th className="py-4 px-6">Source Scope</th>
                        <th className="py-4 px-6">Uploaded By</th>
                        <th className="py-4 px-6">Date Submitted</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm text-white/80">
                      {pendingDocs.map((doc) => (
                        <tr key={doc.fileId} className="hover:bg-white/5 transition-all">
                          <td className="py-4 px-6 font-medium text-white truncate max-w-xs">{doc.name}</td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gold/10 text-gold border border-gold/20">
                              {doc.subCategory} ({doc.userType})
                            </span>
                          </td>
                          <td className="py-4 px-6 text-white/60 font-mono text-xs">{doc.uploadedBy}</td>
                          <td className="py-4 px-6 text-white/60">
                            {formatSafeDate(doc.date || doc.createdAt)}
                          </td>
                          <td className="py-4 px-6 text-right flex justify-end gap-2.5">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer"
                            >
                              Inspect File
                            </a>
                            <button
                              onClick={() => handleApproveDoc(doc.fileId)}
                              className="px-2.5 py-1.5 rounded bg-green-600 hover:bg-green-500 font-bold text-xs text-white transition-all cursor-pointer shadow-md"
                            >
                              Verify / Approve
                            </button>
                            <button
                              onClick={() => handleRejectDoc(doc.fileId)}
                              className="px-2.5 py-1.5 rounded bg-red-600/20 hover:bg-red-600 border border-red-500/30 font-bold text-xs text-red-400 hover:text-white transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SCHOLAR APPLICATIONS (ADMIN ONLY) */}
        {activeTab === 'scholars' && isAdmin && (
          <div className="animate-in fade-in duration-300">
            <AdminScholarTracker />
          </div>
        )}

        {/* TAB 4: SCHOLARS MY APPLICATION (SCHOLAR ONLY) */}
        {activeTab === 'dashboard' && isScholar && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-2xl font-extrabold text-gold-gradient uppercase tracking-wider">Scholar Center</h1>
              <p className="text-xs text-white/50">Manage your scholarship folders and track application status</p>
            </div>
            <ScholarDashboard user={user} />
          </div>
        )}

        {/* TAB 5: DEADLINES TRACKER (ALL ROLES) */}
        {activeTab === 'deadlines' && (
          <div className="flex flex-col md:flex-row gap-8 items-start animate-in fade-in duration-300">
            {/* Admin Add Deadline Form */}
            {isAdmin && (
              <div className="w-full md:w-80 shrink-0">
                <div className="glass-panel rounded-xl p-5 border border-gold/15 flex flex-col gap-4">
                  <div>
                    <h3 className="text-md font-bold text-gold-gradient">Create Deadline</h3>
                    <p className="text-[10px] text-white/50">Schedule submission deadlines for users</p>
                  </div>

                  <form onSubmit={handleSaveDeadline} className="flex flex-col gap-4">
                    <div className="flex flex-col">
                      <label className="input-label text-[11px]">Requirement / Activity Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1st Sem Grade Reports"
                        value={dlTitle}
                        onChange={e => setDlTitle(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="input-label text-[11px]">Target Date & Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={dlDate}
                        onChange={e => setDlDate(e.target.value)}
                        className="input-field text-xs cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="input-label text-[11px]">Target Audience / Role *</label>
                      <select
                        value={dlTargetRole}
                        onChange={e => setDlTargetRole(e.target.value)}
                        className="input-field text-xs cursor-pointer"
                      >
                        <option value="all" className="bg-forest-dark text-white">Everyone / All Roles</option>
                        <option value="scholar" className="bg-forest-dark text-white">Scholars Only</option>
                        <option value="SK" className="bg-forest-dark text-white">SK Barangay Officers</option>
                        <option value="LYDC" className="bg-forest-dark text-white">LYDO Office / LYDC Officers</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={dlSaving}
                      className="w-full py-3 bg-gold-gradient text-forest-dark font-extrabold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer glow-btn hover:shadow-lg flex items-center justify-center"
                    >
                      {dlSaving ? 'Scheduling...' : 'Schedule Deadline'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Deadlines Grid List */}
            <div className="flex-1 w-full">
              <div className="glass-panel rounded-xl p-6 border border-gold/15 flex flex-col gap-4">
                <div>
                  <h3 className="text-md font-bold text-gold-gradient">Scheduled Requirements Deadlines</h3>
                  <p className="text-xs text-white/50">Submit all folder reports before dates expire</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {deadlines.filter(dl => {
                    if (isAdmin) return true;
                    return dl.target_role === 'all' || dl.target_role === user.role;
                  }).length === 0 ? (
                    <div className="col-span-2 py-12 text-center text-white/30">
                      No active deadlines scheduled.
                    </div>
                  ) : (
                    deadlines
                      .filter(dl => {
                        if (isAdmin) return true;
                        return dl.target_role === 'all' || dl.target_role === user.role;
                      })
                      .map(dl => {
                        const dVal = dl.date ? new Date(dl.date) : null;
                        const isExpired = dVal && !isNaN(dVal.getTime()) ? dVal < new Date() : false;
                        return (
                          <div key={dl.id} className={`glass-card border rounded-xl p-4 flex items-center justify-between gap-4 ${isExpired ? 'border-red-500/20 bg-red-500/5' : 'border-white/10'}`}>
                            <div>
                              <h4 className="font-bold text-white leading-snug">{dl.title}</h4>
                              <p className="text-xs text-white/50 mt-1">
                                Due: {formatSafeDate(dl.date)}
                              </p>
                              
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {isExpired ? (
                                  <span className="inline-block px-2 py-0.5 rounded bg-red-500/10 text-[9px] font-bold uppercase text-red-400 border border-red-500/20">
                                    Expired
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded bg-green-500/10 text-[9px] font-bold uppercase text-green-400 border border-green-500/20">
                                    Active
                                  </span>
                                )}
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                  dl.target_role === 'scholar' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                  dl.target_role === 'SK' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  dl.target_role === 'LYDC' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                  'bg-white/5 border-white/10 text-white/60'
                                }`}>
                                  For: {
                                    dl.target_role === 'scholar' ? 'Scholars' :
                                    dl.target_role === 'SK' ? 'SK Barangay' :
                                    dl.target_role === 'LYDC' ? 'LYDO Office' :
                                    'Everyone'
                                  }
                                </span>
                              </div>
                            </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteDeadline(dl.id)}
                              className="p-2 rounded bg-red-500/10 border border-red-500/25 hover:bg-red-600 hover:text-white text-red-400 transition-all cursor-pointer"
                              title="Delete requirement deadline"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CONCERNS MANAGER (ADMIN ONLY) */}
        {activeTab === 'concerns' && isAdmin && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h1 className="text-2xl font-extrabold text-gold-gradient uppercase tracking-wider">Concerns Manager</h1>
                <p className="text-xs text-white/50">Track, monitor, and resolve student and officer tickets directly in Supabase</p>
              </div>
              <button
                onClick={fetchConcerns}
                className="px-3 py-2.5 rounded-lg border border-gold/20 hover:bg-gold/10 text-gold text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                title="Refresh lists"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
                </svg>
                Refresh Data
              </button>
            </div>

            {/* Reported Concerns Table */}
            <div className="glass-panel rounded-xl p-6 border border-gold/15 flex flex-col gap-4">
              <div className="overflow-x-auto w-full border border-white/5 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-gold/80 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Date Reported</th>
                      <th className="py-4 px-6">Reporter</th>
                      <th className="py-4 px-6">Role</th>
                      <th className="py-4 px-6">Barangay</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Description</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm text-white/80">
                    {concernsList.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-white/40">
                          <div className="flex flex-col items-center gap-2">
                            <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>No reported concern tickets active.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      concernsList.map((c) => (
                        <tr key={c.id} className="hover:bg-white/5 transition-all">
                          <td className="py-4 px-6 text-white/60 whitespace-nowrap">{formatSafeDate(c.timestamp)}</td>
                          <td className="py-4 px-6 font-semibold text-white">{c.username}</td>
                          <td className="py-4 px-6 uppercase text-xs text-gold font-bold">{c.role}</td>
                          <td className="py-4 px-6 text-white/60">{c.barangay || 'N/A'}</td>
                          <td className="py-4 px-6 text-white font-semibold">{c.category}</td>
                          <td className="py-4 px-6 text-white/60 max-w-sm" title={c.description}>{c.description}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              c.status === 'Open' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                              c.status === 'In Progress' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                              'bg-green-500/10 border-green-500/30 text-green-400'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              {c.status !== 'Resolved' && (
                                <button
                                  onClick={() => handleUpdateConcernStatus(c.id, 'Resolved')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs transition-all cursor-pointer shadow animate-all"
                                >
                                  Resolve
                                </button>
                              )}
                              {c.status === 'Open' && (
                                <button
                                  onClick={() => handleUpdateConcernStatus(c.id, 'In Progress')}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-xs transition-all cursor-pointer shadow animate-all"
                                >
                                  In Progress
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: USER ACCOUNTS & AUDIT LOGS (ADMIN ONLY) */}
        {activeTab === 'accounts' && isAdmin && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Split Grid */}
            <div className="flex flex-col xl:flex-row gap-8 items-start">
              {/* Add Account Card */}
              <div className="w-full xl:w-80 shrink-0">
                <div className="glass-panel rounded-xl p-5 border border-gold/15 flex flex-col gap-4">
                  <div>
                    <h3 className="text-md font-bold text-gold-gradient">Create User Account</h3>
                    <p className="text-[10px] text-white/50">Register system credentials for officers</p>
                  </div>

                  {acctMsg.text && (
                    <div className={`p-3 text-xs rounded-lg ${acctMsg.isError ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                      {acctMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleAddAccount} className="flex flex-col gap-4">
                    <div className="flex flex-col">
                      <label className="input-label text-[11px]">Display / Friendly Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. San Jose SK Chair"
                        value={newDisplayName}
                        onChange={e => setNewDisplayName(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="input-label text-[11px]">Role Permission Scope *</label>
                      <select
                        value={newRole}
                        onChange={e => setNewRole(e.target.value)}
                        className="input-field text-xs cursor-pointer"
                      >
                        <option value="admin" className="bg-forest-dark text-white">System Admin</option>
                        <option value="SK" className="bg-forest-dark text-white">SK Officer</option>
                        <option value="LYDC" className="bg-forest-dark text-white">LYDC Center Officer</option>
                        <option value="scholar" className="bg-forest-dark text-white">Scholar / Applicant</option>
                      </select>
                    </div>

                    {(newRole === 'SK' || newRole === 'scholar') && (
                      <div className="flex flex-col">
                        <label className="input-label text-[11px]">Registered Barangay *</label>
                        <select
                          value={newBarangay}
                          onChange={e => setNewBarangay(e.target.value)}
                          className="input-field text-xs cursor-pointer"
                        >
                          {BARANGAYS.map(b => (
                            <option key={b} value={b} className="bg-forest-dark text-white">{b}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex flex-col">
                      <label className="input-label text-[11px]">Login Username *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. sk_sanjose"
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        className="input-field text-xs font-mono"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="input-label text-[11px]">Account Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Min 8 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="input-field text-xs"
                        minLength={8}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={acctLoading}
                      className="w-full py-3 bg-gold-gradient text-forest-dark font-extrabold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer glow-btn hover:shadow-lg flex items-center justify-center"
                    >
                      {acctLoading ? 'Registering...' : 'Register User'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Accounts Table List */}
              <div className="flex-1 w-full">
                <div className="glass-panel rounded-xl p-6 border border-gold/15 flex flex-col gap-4">
                  <div>
                    <h3 className="text-md font-bold text-gold-gradient">Active System Accounts</h3>
                    <p className="text-xs text-white/50">Manage profiles and authorization scopes</p>
                  </div>

                  <div className="overflow-x-auto w-full border border-white/5 rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-gold/80 text-xs font-semibold uppercase tracking-wider">
                          <th className="py-4 px-6">Display Name / User</th>
                          <th className="py-4 px-6">Role Scope</th>
                          <th className="py-4 px-6">Registered Center/Barangay</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm text-white/80">
                        {usersList.map(u => (
                          <tr key={u.username} className="hover:bg-white/5 transition-all">
                            <td className="py-4 px-6">
                              <span className="font-semibold text-white">{u.displayName}</span>
                              <p className="text-xs text-white/40 font-mono mt-0.5">{u.username}</p>
                            </td>
                            <td className="py-4 px-6 font-semibold uppercase text-xs text-gold">{u.role}</td>
                            <td className="py-4 px-6 text-white/60">{u.barangay || 'All Centers / System'}</td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => handleDeleteAccount(u.username)}
                                disabled={u.username === user.username}
                                className="p-2 rounded bg-red-500/10 border border-red-500/25 hover:bg-red-600 hover:text-white text-red-400 transition-all cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                                title="Remove User Account"
                              >
                                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Logs Block */}
            <div className="glass-panel rounded-xl p-6 border border-gold/15 flex flex-col gap-4">
              <div>
                <h3 className="text-md font-bold text-gold-gradient">Security Action Audit Trails</h3>
                <p className="text-xs text-white/50">Comprehensive system logging trail of logins, uploads, and evaluations</p>
              </div>

              <div className="overflow-x-auto w-full border border-white/5 rounded-lg max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-gold/80 text-[10px] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-6">Timestamp</th>
                      <th className="py-3 px-6">Actor</th>
                      <th className="py-3 px-6">Action Event</th>
                      <th className="py-3 px-6">Details Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-white/70 font-mono">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-all">
                        <td className="py-3 px-6 whitespace-nowrap">{formatSafeDate(log.timestamp)}</td>
                        <td className="py-3 px-6 font-semibold text-white">{log.actor}</td>
                        <td className="py-3 px-6"><span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-white/80">{log.action}</span></td>
                        <td className="py-3 px-6 text-white/60 truncate max-w-md" title={log.details}>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Report Concern Button */}
      {user && (
        <button
          onClick={() => {
            setConcernCategory('General Concern');
            setConcernDescription('');
            setConcernMsg({ text: '', isError: false });
            setIsConcernOpen(true);
          }}
          className="fixed bottom-6 right-6 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg border border-emerald-500/30 flex items-center gap-2 font-bold text-xs transition-all hover:scale-105 glow-btn z-50 cursor-pointer"
        >
          <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Report Concern
        </button>
      )}

      {/* Report Concern Modal */}
      {isConcernOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel border border-gold/25 rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-gold-gradient">Report a Concern</h3>
              <button
                onClick={() => setIsConcernOpen(false)}
                className="text-white/40 hover:text-white transition-all text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            {concernMsg.text && (
              <div className={`p-3 text-xs rounded-lg ${concernMsg.isError ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                {concernMsg.text}
              </div>
            )}

            <form onSubmit={handleConcernSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col">
                <label className="input-label text-xs">Concern Category *</label>
                <select
                  value={concernCategory}
                  onChange={e => setConcernCategory(e.target.value)}
                  className="input-field text-xs cursor-pointer"
                >
                  <option value="General Concern" className="bg-forest-dark text-white">General Concern</option>
                  <option value="Technical Issue" className="bg-forest-dark text-white">Technical Issue</option>
                  <option value="Data Discrepancy" className="bg-forest-dark text-white">Data Discrepancy</option>
                  <option value="Scholar Portal Issue" className="bg-forest-dark text-white">Scholar Portal Issue</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="input-label text-xs">Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue or concern in detail..."
                  value={concernDescription}
                  onChange={e => setConcernDescription(e.target.value)}
                  className="input-field text-xs resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={concernLoading}
                className="w-full py-2.5 bg-gold-gradient text-forest-dark font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-md glow-btn cursor-pointer disabled:opacity-50"
              >
                {concernLoading ? 'Submitting...' : 'Submit Concern'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Trigger Vercel rebuild to refresh env variables
