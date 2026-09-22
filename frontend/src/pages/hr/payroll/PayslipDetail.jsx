import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer, Download, CheckCircle, XCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

const PayslipDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchPayslip();
  }, [id]);

  const fetchPayslip = async () => {
    try {
      const { data } = await axios.get(`/api/v1/hr/payslips/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPayslip(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Payslip-${payslip?.payslipNumber}`
  });

  const handleDownloadPdf = async () => {
    try {
      const response = await axios.get(`/api/v1/hr/payslips/${id}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${payslip.payslipNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download PDF', error);
    }
  };

  const handleAction = async (action) => {
    try {
      await axios.post(`/api/v1/hr/payslips/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPayslip();
    } catch (error) {
      console.error(`Failed to ${action} payslip`, error);
    }
  };

  if (!hasPermission('PAYROLL.PAYSLIP.VIEW')) {
    return <div className="p-8 text-center">Access Denied</div>;
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading payslip details...</div>;
  if (!payslip) return <div className="p-8 text-center text-red-500">Payslip not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/payslips')}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} /> Back to Payslips
        </button>
        <div className="flex items-center gap-2">
          {payslip.status === 'GENERATED' && hasPermission('PAYROLL.PAYSLIP.FINALIZE') && (
            <Button onClick={() => handleAction('finalize')} className="bg-green-600 hover:bg-green-700">
              <CheckCircle size={16} className="mr-2" /> Finalize
            </Button>
          )}
          {(payslip.status === 'GENERATED' || payslip.status === 'FINALIZED') && hasPermission('PAYROLL.PAYSLIP.CANCEL') && (
            <Button variant="danger" onClick={() => handleAction('cancel')}>
              <XCircle size={16} className="mr-2" /> Cancel
            </Button>
          )}
          {hasPermission('PAYROLL.PAYSLIP.PRINT') && (
            <Button variant="outline" onClick={handlePrint}>
              <Printer size={16} className="mr-2" /> Print
            </Button>
          )}
          {hasPermission('PAYROLL.PAYSLIP.DOWNLOAD') && (
            <Button onClick={handleDownloadPdf}>
              <Download size={16} className="mr-2" /> Download PDF
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-center w-full">
        <Card className="w-full max-w-4xl" ref={printRef}>
          <CardContent className="p-10 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-border pb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary">PAYSLIP</h1>
                <p className="text-muted-foreground mt-1">Period: {payslip.payrollPeriodId?.name}</p>
                <div className="mt-2">
                  <Badge variant={payslip.status === 'FINALIZED' ? 'success' : payslip.status === 'CANCELLED' ? 'danger' : 'primary'}>
                    {payslip.status}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-foreground">Global ERP Inc.</div>
                <div className="text-sm text-muted-foreground mt-1">Payslip No: <span className="font-medium text-foreground">{payslip.payslipNumber}</span></div>
                <div className="text-sm text-muted-foreground">Payment Date: <span className="font-medium text-foreground">{new Date(payslip.paymentDate).toLocaleDateString()}</span></div>
              </div>
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-8 bg-muted/20 p-6 rounded-lg border border-border">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Employee Code:</span>
                  <span className="font-semibold text-sm">{payslip.employeeCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Name:</span>
                  <span className="font-semibold text-sm">{payslip.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Designation:</span>
                  <span className="font-semibold text-sm">{payslip.designation || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Department:</span>
                  <span className="font-semibold text-sm">{payslip.department || '-'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Pay Frequency:</span>
                  <span className="font-semibold text-sm">{payslip.payFrequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Working Days:</span>
                  <span className="font-semibold text-sm">{payslip.workingDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Payable Days:</span>
                  <span className="font-semibold text-sm">{payslip.payableDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Unpaid Leave:</span>
                  <span className="font-semibold text-sm">{payslip.unpaidLeaveDays}</span>
                </div>
              </div>
            </div>

            {/* Salary Breakdown */}
            <div className="grid grid-cols-2 gap-0 border border-border rounded-lg overflow-hidden">
              {/* Earnings */}
              <div className="border-r border-border">
                <div className="bg-muted/50 p-3 border-b border-border font-bold text-sm">
                  EARNINGS
                </div>
                <div className="p-4 space-y-3 min-h-[200px]">
                  {payslip.earnings?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-medium">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-muted/30 p-4 border-t border-border flex justify-between font-bold">
                  <span>Total Earnings</span>
                  <span>{payslip.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              
              {/* Deductions */}
              <div>
                <div className="bg-muted/50 p-3 border-b border-border font-bold text-sm">
                  DEDUCTIONS
                </div>
                <div className="p-4 space-y-3 min-h-[200px]">
                  {payslip.deductions?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-medium">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-muted/30 p-4 border-t border-border flex justify-between font-bold">
                  <span>Total Deductions</span>
                  <span>{payslip.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div className="flex justify-end">
              <div className="bg-green-50 border border-green-200 text-green-900 rounded-lg p-6 w-full max-w-sm">
                <div className="text-sm font-semibold text-green-700/80 uppercase tracking-wider mb-1">NET PAYABLE</div>
                <div className="text-3xl font-black tracking-tight">
                  {payslip.currency} {payslip.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-green-700/60 mt-2">
                  Amount transferred to employee's account
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="pt-8 text-center text-xs text-muted-foreground border-t border-border mt-8">
              This is a system-generated payslip and does not require a signature. <br />
              Generated on {new Date(payslip.generatedAt).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayslipDetail;
