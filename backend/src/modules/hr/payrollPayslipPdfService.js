const PDFDocument = require('pdfkit');

exports.generatePayslipPdf = (payslip, company) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Colors & Fonts
      const primaryColor = '#2563eb';
      const textColor = '#333333';
      const mutedColor = '#666666';

      // --- Header / Company Info ---
      doc.fontSize(20).fillColor(primaryColor).text(company?.name || 'Company Name', { align: 'center' });
      doc.fontSize(10).fillColor(mutedColor).text(company?.address || 'Company Address', { align: 'center' });
      doc.moveDown(2);

      // --- Payslip Title ---
      doc.fontSize(16).fillColor(textColor).text('PAYSLIP', { align: 'center' });
      doc.moveDown(1.5);

      // --- Document Info ---
      doc.fontSize(10);
      const drawInfoRow = (y, leftLabel, leftValue, rightLabel, rightValue) => {
        doc.fillColor(mutedColor).text(leftLabel, 50, y);
        doc.fillColor(textColor).text(leftValue, 130, y);
        doc.fillColor(mutedColor).text(rightLabel, 300, y);
        doc.fillColor(textColor).text(rightValue, 380, y);
      };

      let currentY = doc.y;
      drawInfoRow(currentY, 'Payslip No:', payslip.payslipNumber, 'Pay Period:', payslip.payrollPeriodId?.name || 'N/A');
      drawInfoRow(currentY + 20, 'Payment Date:', new Date(payslip.paymentDate).toLocaleDateString(), 'Currency:', payslip.currency);
      doc.y = currentY + 50;

      // --- Employee Info ---
      doc.rect(50, doc.y, 495, 20).fill('#f3f4f6');
      doc.fillColor(textColor).font('Helvetica-Bold').text('EMPLOYEE INFORMATION', 55, doc.y + 6);
      doc.font('Helvetica').moveDown(1.5);
      
      currentY = doc.y;
      drawInfoRow(currentY, 'Employee Code:', payslip.employeeCode, 'Name:', payslip.employeeName);
      drawInfoRow(currentY + 20, 'Department:', payslip.department || '-', 'Designation:', payslip.designation || '-');
      drawInfoRow(currentY + 40, 'Pay Frequency:', payslip.payFrequency, 'Employment:', payslip.employmentType || '-');
      doc.y = currentY + 70;

      // --- Attendance Summary ---
      doc.rect(50, doc.y, 495, 20).fill('#f3f4f6');
      doc.fillColor(textColor).font('Helvetica-Bold').text('ATTENDANCE SUMMARY', 55, doc.y + 6);
      doc.font('Helvetica').moveDown(1.5);
      
      currentY = doc.y;
      drawInfoRow(currentY, 'Working Days:', payslip.workingDays, 'Payable Days:', payslip.payableDays);
      drawInfoRow(currentY + 20, 'Present Days:', payslip.presentDays, 'Absent Days:', payslip.absentDays);
      drawInfoRow(currentY + 40, 'Paid Leave:', payslip.paidLeaveDays, 'Unpaid Leave:', payslip.unpaidLeaveDays);
      doc.y = currentY + 70;

      // --- Salary Components Tables ---
      const drawTableHeaders = (y) => {
        doc.rect(50, y, 240, 20).fill('#e5e7eb');
        doc.rect(305, y, 240, 20).fill('#e5e7eb');
        doc.fillColor(textColor).font('Helvetica-Bold');
        doc.text('EARNINGS', 55, y + 6);
        doc.text('AMOUNT', 200, y + 6, { width: 85, align: 'right' });
        doc.text('DEDUCTIONS', 310, y + 6);
        doc.text('AMOUNT', 455, y + 6, { width: 85, align: 'right' });
        doc.font('Helvetica');
      };

      let tableY = doc.y;
      drawTableHeaders(tableY);
      tableY += 25;

      const earnings = payslip.earnings || [];
      const deductions = payslip.deductions || [];
      const maxRows = Math.max(earnings.length, deductions.length);
      
      for (let i = 0; i < maxRows; i++) {
        const earn = earnings[i];
        const ded = deductions[i];
        
        doc.fillColor(textColor);
        if (earn) {
          doc.text(earn.name, 55, tableY);
          doc.text(earn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }), 200, tableY, { width: 85, align: 'right' });
        }
        if (ded) {
          doc.text(ded.name, 310, tableY);
          doc.text(ded.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }), 455, tableY, { width: 85, align: 'right' });
        }
        tableY += 20;
      }

      // Add a separator line
      doc.moveTo(50, tableY).lineTo(545, tableY).strokeColor('#e5e7eb').stroke();
      tableY += 10;

      // Totals Row
      doc.font('Helvetica-Bold');
      doc.text('TOTAL EARNINGS', 55, tableY);
      doc.text(payslip.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 }), 200, tableY, { width: 85, align: 'right' });
      doc.text('TOTAL DEDUCTIONS', 310, tableY);
      doc.text(payslip.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 }), 455, tableY, { width: 85, align: 'right' });
      doc.font('Helvetica');
      doc.y = tableY + 30;

      // --- Final Net Pay Box ---
      doc.rect(305, doc.y, 240, 30).fill('#f0fdf4');
      doc.fillColor('#166534').font('Helvetica-Bold');
      doc.text('NET SALARY:', 315, doc.y + 10);
      doc.text(`${payslip.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${payslip.currency}`, 420, doc.y + 10, { width: 115, align: 'right' });
      doc.font('Helvetica');
      doc.moveDown(3);

      // --- Footer ---
      doc.fillColor(mutedColor).fontSize(8);
      doc.text('This is a system-generated payslip and does not require a signature.', 50, doc.y, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
