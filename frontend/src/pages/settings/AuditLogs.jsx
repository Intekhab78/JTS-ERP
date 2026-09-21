import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Shield, Eye, Calendar, MapPin, User, Tag, Activity } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { Card, CardContent } from '../../components/common/Card';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { Drawer } from '../../components/common/Drawer';
import { FilterBar } from '../../components/common/FilterBar';

const AUDIT_ACTIONS = [
  'POS_SESSION_OPEN',
  'POS_SESSION_CLOSE',
  'POS_SESSION_FORCE_CLOSE',
  'POS_ORDER_CREATE',
  'POS_RETURN_CREATE'
];

const ActionBadge = ({ action }) => {
  let colorClass = 'bg-slate-100 text-slate-800 border-slate-200';
  
  if (action.includes('CREATE')) colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (action.includes('CLOSE')) colorClass = 'bg-amber-100 text-amber-800 border-amber-200';
  if (action.includes('FORCE_CLOSE')) colorClass = 'bg-rose-100 text-rose-800 border-rose-200';
  if (action.includes('OPEN')) colorClass = 'bg-blue-100 text-blue-800 border-blue-200';

  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider border ${colorClass}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entityType: '',
    branchId: '',
    userId: '',
    startDate: '',
    endDate: ''
  });
  
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/v1/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error('Failed to fetch branches for filter');
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const res = await axios.get('http://localhost:5000/api/v1/audit/logs', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      if (res.data && res.data.success) {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
      if (error.response?.status === 403) {
        setLogs([]); // unauthorized
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const columns = [
    { 
      header: 'Timestamp', 
      cell: (log) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">
            {new Date(log.timestamp).toLocaleDateString()}
          </span>
          <span className="text-xs text-slate-500">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ) 
    },
    { 
      header: 'Action', 
      cell: (log) => <ActionBadge action={log.action} /> 
    },
    { 
      header: 'User', 
      cell: (log) => log.userId ? (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
            {log.userId.firstName?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{log.userId.firstName} {log.userId.lastName}</span>
            <span className="text-[10px] text-slate-500">{log.userId.email}</span>
          </div>
        </div>
      ) : <span className="text-slate-400 italic">System</span>
    },
    { 
      header: 'Entity', 
      cell: (log) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-indigo-600">{log.entityType}</span>
          <span className="text-[10px] text-slate-500 truncate max-w-[120px] font-mono" title={log.entityId}>
            {log.entityId}
          </span>
        </div>
      ) 
    },
    { 
      header: 'IP Address', 
      cell: (log) => <span className="text-xs font-mono text-slate-600">{log.ipAddress || '-'}</span> 
    },
    {
      header: '',
      id: 'actions',
      cell: (log) => (
        <button 
          onClick={() => {
            setSelectedLog(log);
            setIsDrawerOpen(true);
          }}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="View Details"
        >
          <Eye size={18} />
        </button>
      )
    }
  ];

  const filterOptions = [
    {
      key: 'action',
      label: 'Action',
      type: 'select',
      options: AUDIT_ACTIONS.map(a => ({ value: a, label: a.replace(/_/g, ' ') }))
    },
    {
      key: 'entityType',
      label: 'Entity Type',
      type: 'select',
      options: [
        { value: 'POSSession', label: 'POS Session' },
        { value: 'POSOrder', label: 'POS Order' },
        { value: 'POSReturn', label: 'POS Return' }
      ]
    },
    {
      key: 'branchId',
      label: 'Branch',
      type: 'select',
      options: branches.map(b => ({ value: b._id, label: b.name }))
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Security Audit Logs" 
          description="Immutable record of critical security and financial events. Editing and deletion are disabled at the database level."
        />
        <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg border border-rose-200">
          <Shield size={16} className="text-rose-600" />
          <span className="text-sm font-semibold">Strict Immutability Enforced</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <FilterBar
            onFilterChange={handleFilterChange}
            searchPlaceholder="Search events, reasons, or entity IDs..."
            filters={filterOptions}
            showDateRange={true}
          />

          {isLoading ? (
            <div className="p-6"><PageSkeleton /></div>
          ) : (
            <>
              <DataTable 
                columns={columns} 
                data={logs} 
                keyExtractor={(item) => item._id}
              />
              
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium">
                  Showing {logs.length} of {pagination.total} records
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="px-3 py-1 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="px-3 py-1 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Audit Event Details"
        size="md"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <ActionBadge action={selectedLog.action} />
              <span className="text-sm font-mono text-slate-500">ID: {selectedLog._id}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Calendar size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Timestamp</span>
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {new Date(selectedLog.timestamp).toLocaleDateString()}
                </div>
                <div className="text-xs text-slate-600">
                  {new Date(selectedLog.timestamp).toLocaleTimeString()}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <User size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Actor</span>
                </div>
                {selectedLog.userId ? (
                  <>
                    <div className="text-sm font-semibold text-slate-800">
                      {selectedLog.userId.firstName} {selectedLog.userId.lastName}
                    </div>
                    <div className="text-xs text-slate-600">
                      {selectedLog.userId.email}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-medium text-slate-500 italic">System</div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Tag size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Entity</span>
                </div>
                <div className="text-sm font-semibold text-indigo-600">
                  {selectedLog.entityType}
                </div>
                <div className="text-xs font-mono text-slate-600 break-all">
                  {selectedLog.entityId}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Activity size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Request Source</span>
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  IP: {selectedLog.ipAddress || '-'}
                </div>
              </div>
            </div>
            
            {(selectedLog.branchId || selectedLog.registerId || selectedLog.sessionId) && (
              <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2">
                  <MapPin size={16} className="text-indigo-600" />
                  Location & Session Context
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedLog.branchId && (
                    <div>
                      <span className="block text-xs text-slate-500 mb-1">Branch ID</span>
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">{selectedLog.branchId}</span>
                    </div>
                  )}
                  {selectedLog.registerId && (
                    <div>
                      <span className="block text-xs text-slate-500 mb-1">Register ID</span>
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">{selectedLog.registerId}</span>
                    </div>
                  )}
                  {selectedLog.sessionId && (
                    <div className="col-span-2">
                      <span className="block text-xs text-slate-500 mb-1">POS Session ID</span>
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">{selectedLog.sessionId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedLog.reason && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <span className="block text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">Reason / Override</span>
                <p className="text-sm text-amber-900 font-medium">{selectedLog.reason}</p>
              </div>
            )}

            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  Metadata Snapshot
                </span>
                <div className="bg-[#1e1e1e] rounded-xl p-4 overflow-x-auto border border-slate-800">
                  <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AuditLogs;
