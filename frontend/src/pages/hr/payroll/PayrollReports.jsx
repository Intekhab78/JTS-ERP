import React, { useState, useEffect } from 'react';
import { FileText, Download, BarChart2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardHeader, CardContent } from '../../../components/common/Card';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { CardSkeleton } from '../../../components/common/CardSkeleton';

const REPORT_TYPES = [
  { id: 'summary', name: 'Payroll Summary', endpoint: 'summary' },
  { id: 'employees', name: 'Employee Payroll', endpoint: 'employees' },
  { id: 'departments', name: 'Department Summary', endpoint: 'departments' },
  { id: 'earnings', name: 'Earnings Report', endpoint: 'earnings' },
  { id: 'deductions', name: 'Deductions Report', endpoint: 'deductions' }
];

const PayrollReports = () => {
  const [activeReport, setActiveReport] = useState(REPORT_TYPES[0]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/v1/hr/payroll-periods', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPeriods(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchPeriods();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeReport, selectedPeriod]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPeriod) params.append('period', selectedPeriod);

      const res = await axios.get(`http://localhost:5000/api/v1/hr/payroll-reports/${activeReport.endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setData(res.data);
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    const params = new URLSearchParams();
    if (selectedPeriod) params.append('period', selectedPeriod);
    params.append('download', 'true');

    window.open(`http://localhost:5000/api/v1/hr/payroll-reports/${activeReport.endpoint}?${params.toString()}&token=${localStorage.getItem('token')}`, '_blank');
  };

  if (!hasPermission('PAYROLL.REPORT.VIEW')) {
    return <div className="p-8 text-center">Access Denied</div>;
  }

  const renderTableHeaders = () => {
    if (!data || data.length === 0) return null;
    const sample = data[0];
    return (
      <tr>
        {Object.keys(sample).map(key => (
          <th key={key} className="px-4 py-3 font-semibold capitalize text-muted-foreground bg-muted/50">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </th>
        ))}
      </tr>
    );
  };

  const renderTableRows = () => {
    if (!data || data.length === 0) return null;
    return data.map((row, i) => (
      <tr key={i} className="border-b border-border hover:bg-muted/20">
        {Object.values(row).map((val, j) => (
          <td key={j} className="px-4 py-3 text-sm">
            {typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: val % 1 === 0 ? 0 : 2 }) : String(val)}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <BarChart2 className="text-primary h-8 w-8" /> 
            Payroll Reports
          </div>
        }
        description="View and export aggregated payroll data."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="col-span-1 space-y-2">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Report Types</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                {REPORT_TYPES.map(report => (
                  <button
                    key={report.id}
                    onClick={() => setActiveReport(report)}
                    className={`flex items-center px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                      activeReport.id === report.id 
                        ? 'bg-primary/5 text-primary border-primary' 
                        : 'border-transparent hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <FileText size={16} className="mr-3 opacity-70" />
                    {report.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-3 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <h2 className="text-lg font-bold">{activeReport.name}</h2>
              <div className="flex items-center gap-4">
                <div className="w-64">
                  <Select 
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  >
                    <option value="">All Periods (YTD)</option>
                    {periods.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
                {hasPermission('PAYROLL.REPORT.EXPORT') && (
                  <Button onClick={handleDownloadCsv} variant="outline" disabled={!data || data.length === 0}>
                    <Download size={16} className="mr-2" /> Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            
            {isLoading ? (
              <CardSkeleton />
            ) : !data || data.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <BarChart2 className="h-12 w-12 opacity-20 mb-4" />
                <p>No data available for the selected filters.</p>
              </div>
            ) : (
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    {renderTableHeaders()}
                  </thead>
                  <tbody>
                    {renderTableRows()}
                  </tbody>
                </table>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PayrollReports;
