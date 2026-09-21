// Entry point for backend server
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Enterprise ERP API is running' });
});

// Import Routes
app.use('/api/v1/auth', require('./src/core/auth/authRoutes'));
app.use('/api/v1/roles', require('./src/core/auth/roleRoutes'));
app.use('/api/v1/users', require('./src/core/auth/userRoutes'));
app.use('/api/v1/company', require('./src/modules/company/companyRoutes'));
app.use('/api/v1/branches', require('./src/modules/branch/branchRoutes'));
app.use('/api/v1/inventory', require('./src/modules/inventory/inventoryRoutes'));
app.use('/api/v1/hierarchy', require('./src/modules/inventory/hierarchyRoutes'));
app.use('/api/v1/stock', require('./src/modules/inventory/stockRoutes'));
app.use('/api/v1/sales/returns', require('./src/modules/sales/salesReturnRoutes'));
app.use('/api/v1/sales', require('./src/modules/sales/salesRoutes'));
app.use('/api/v1/pos', require('./src/modules/sales/posRoutes'));
app.use('/api/v1/quotes', require('./src/modules/sales/quoteRoutes'));
app.use('/api/v1/proforma', require('./src/modules/sales/proFormaRoutes'));
app.use('/api/v1/delivery-notes', require('./src/modules/sales/deliveryNoteRoutes'));
app.use('/api/v1/tax-invoices', require('./src/modules/sales/taxInvoiceRoutes'));
app.use('/api/v1/taxes', require('./src/modules/settings/taxRoutes'));
app.use('/api/v1/payments', require('./src/modules/sales/paymentRoutes'));
app.use('/api/v1/suppliers', require('./src/modules/purchase/supplierRoutes'));
app.use('/api/v1/purchases', require('./src/modules/purchase/purchaseRoutes'));
app.use('/api/v1/rfqs', require('./src/modules/purchase/rfqRoutes'));
app.use('/api/v1/vendor-returns', require('./src/modules/purchase/vendorReturnRoutes'));
app.use('/api/v1/grn', require('./src/modules/purchase/grnRoutes'));
app.use('/api/v1/vendor-bills', require('./src/modules/purchase/vendorBillRoutes'));
app.use('/api/v1/vendor-payments', require('./src/modules/purchase/vendorPaymentRoutes'));

app.use('/api/v1/consignments', require('./src/modules/purchase/consignmentRoutes'));
app.use('/api/v1/consignment-receipts', require('./src/modules/purchase/consignmentReceiptRoutes'));
app.use('/api/v1/consignment-returns', require('./src/modules/purchase/consignmentReturnRoutes'));
app.use('/api/v1/consignment-stock', require('./src/modules/purchase/consignmentStockRoutes'));

app.use('/api/v1/consignment-settlements', require('./src/modules/purchase/consignmentSettlementRoutes'));
app.use('/api/v1/accounts', require('./src/modules/accounts/accountRoutes'));
app.use('/api/v1/account-mappings', require('./src/modules/accounts/mappingRoutes'));
app.use('/api/v1/journal', require('./src/modules/accounts/journalRoutes'));
app.use('/api/v1/crm', require('./src/modules/crm/crmRoutes'));
app.use('/api/v1/hr', require('./src/modules/hr/hrRoutes'));
app.use('/api/v1/payroll', require('./src/modules/hr/payrollRoutes'));
app.use('/api/v1/manufacturing', require('./src/modules/manufacturing/manufacturingRoutes'));
app.use('/api/v1/ecommerce', require('./src/modules/ecommerce/ecommerceRoutes'));
app.use('/api/v1/ecommerce-admin', require('./src/modules/ecommerce/internalEcommerceRoutes'));
app.use('/api/v1/dashboard', require('./src/modules/dashboard/dashboardRoutes'));
app.use('/api/v1/audit', require('./src/modules/audit/auditRoutes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// restarted
// restarted frontend for DeliveryNoteForm.jsx
// restarted frontend for DeliveryNoteForm.jsx
