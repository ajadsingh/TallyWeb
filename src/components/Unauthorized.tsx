import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
    <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
      <h1 className="text-3xl font-semibold text-slate-900 mb-4">Access denied</h1>
      <p className="text-slate-600 mb-6">You do not have permission to view this page. Please contact your administrator if you believe this is an error.</p>
      <Link to="/dashboard" className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
        Return to dashboard
      </Link>
    </div>
  </div>
);

export default Unauthorized;
