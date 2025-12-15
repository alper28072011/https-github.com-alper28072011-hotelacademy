
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Activity, Users, DollarSign, Database } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20">
                <ShieldCheck className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
                <h1 className="text-xl font-bold">System Control</h1>
                <p className="text-xs text-gray-400 font-mono">ROOT_ACCESS_GRANTED</p>
            </div>
        </div>
        <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm font-bold"
        >
            <ArrowLeft className="w-4 h-4" /> Exit
        </button>
      </div>

      {/* Grid */}
      <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                  <Activity className="w-6 h-6 text-green-400" />
                  <span className="text-xs font-bold bg-green-400/10 text-green-400 px-2 py-1 rounded">Healthy</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">99.9%</h3>
              <p className="text-sm text-gray-400">System Uptime</p>
          </div>

          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                  <Users className="w-6 h-6 text-blue-400" />
                  <span className="text-xs font-bold bg-blue-400/10 text-blue-400 px-2 py-1 rounded">+12 Today</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">1,245</h3>
              <p className="text-sm text-gray-400">Active Tenants</p>
          </div>

          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                  <Database className="w-6 h-6 text-purple-400" />
                  <span className="text-xs font-bold bg-purple-400/10 text-purple-400 px-2 py-1 rounded">2.4GB</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">45k</h3>
              <p className="text-sm text-gray-400">Total Records</p>
          </div>

          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                  <DollarSign className="w-6 h-6 text-yellow-400" />
                  <span className="text-xs font-bold bg-yellow-400/10 text-yellow-400 px-2 py-1 rounded">MRR</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">$12.5k</h3>
              <p className="text-sm text-gray-400">Monthly Revenue</p>
          </div>
      </div>

      <div className="px-8 max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 text-center text-gray-500">
              <p>Advanced configuration modules are under development.</p>
          </div>
      </div>
    </div>
  );
};
