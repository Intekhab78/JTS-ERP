const Account = require('../core/models/Account');
const AccountMapping = require('../core/models/AccountMapping');
const JournalEntry = require('../core/models/JournalEntry');
const AccountingService = require('./accountingService');

const DEFAULT_COA = [
  { code: '1000', name: 'Cash on Hand', type: 'ASSET', description: 'Liquid cash in company possession or cash drawers' },
  { code: '1010', name: 'Main Bank Account', type: 'ASSET', description: 'Primary company operating bank account' },
  { code: '1020', name: 'Payment Gateway Clearing', type: 'ASSET', description: 'Online gateway receivable (Razorpay/Stripe)' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', description: 'Amounts due from customers for credit sales' },
  { code: '1200', name: 'Inventory / Stock on Hand', type: 'ASSET', description: 'Current valuation of physical warehouse stock' },
  { code: '1210', name: 'GR/IR Clearing Account', type: 'LIABILITY', description: 'Goods Receipt / Invoice Receipt accrued clearing account' },
  { code: '1300', name: 'Input GST / Tax Credit', type: 'ASSET', description: 'Tax paid on purchases and eligible for setoff' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', description: 'Amounts owed to suppliers and vendors' },
  { code: '2100', name: 'Output GST / Sales Tax Payable', type: 'LIABILITY', description: 'Tax collected on sales payable to government' },
  { code: '2200', name: 'Customer Advances', type: 'LIABILITY', description: 'Advance payments received before order fulfillment' },
  { code: '2300', name: 'Salaries & Wages Payable', type: 'LIABILITY', description: 'Accrued employee payroll liabilities' },
  { code: '3000', name: 'Owners Capital & Retained Earnings', type: 'EQUITY', description: 'Accumulated business equity' },
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE', description: 'Primary income from goods and services sold' },
  { code: '4010', name: 'E-Commerce Sales Revenue', type: 'REVENUE', description: 'Revenue generated via online storefront' },
  { code: '4020', name: 'POS Retail Sales', type: 'REVENUE', description: 'Counter retail sales revenue' },
  { code: '4100', name: 'Sales Returns & Allowances', type: 'REVENUE', description: 'Contra-revenue account for customer returns' },
  { code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', description: 'Direct acquisition cost of inventory sold' },
  { code: '5100', name: 'Purchase Inward Account', type: 'EXPENSE', description: 'Direct procurement expense account' },
  { code: '5200', name: 'Purchase Returns', type: 'EXPENSE', description: 'Contra-expense account for vendor returns' },
  { code: '6000', name: 'Salaries & Wages Expense', type: 'EXPENSE', description: 'Monthly employee compensation and allowances' },
  { code: '6100', name: 'Inventory Shrinkage & Loss', type: 'EXPENSE', description: 'Loss due to damaged, expired or missing stock' },
  { code: '6200', name: 'Bank & Gateway Charges', type: 'EXPENSE', description: 'Transaction processing and banking fees' }
];

const DEFAULT_MAPPINGS = [
  { key: 'ACCOUNTS_RECEIVABLE', code: '1100' },
  { key: 'SALES_REVENUE', code: '4000' },
  { key: 'ECOMMERCE_REVENUE', code: '4010' },
  { key: 'POS_REVENUE', code: '4020' },
  { key: 'SALES_RETURN', code: '4100' },
  { key: 'TAX_PAYABLE', code: '2100' },
  { key: 'TAX_RECEIVABLE', code: '1300' },
  { key: 'ACCOUNTS_PAYABLE', code: '2000' },
  { key: 'INVENTORY', code: '1200' },
  { key: 'GRIR_CLEARING', code: '1210' },
  { key: 'COGS', code: '5000' },
  { key: 'CASH', code: '1000' },
  { key: 'BANK', code: '1010' },
  { key: 'GATEWAY_CLEARING', code: '1020' },
  { key: 'STOCK_LOSS', code: '6100' },
  { key: 'STOCK_GAIN', code: '4000' },
  { key: 'SALARY_EXPENSE', code: '6000' },
  { key: 'SALARY_PAYABLE', code: '2300' }
];

class AutoPostingService {

  /**
   * Helper to ensure a tenant has the standard Chart of Accounts & Mappings
   */
  static async ensureDefaultAccounts(tenantId) {
    if (!tenantId) return;

    // 1. Ensure all standard accounts exist
    const accountMap = new Map();
    for (const item of DEFAULT_COA) {
      let acc = await Account.findOne({ tenantId, code: item.code });
      if (!acc) {
        acc = await Account.create({
          tenantId,
          code: item.code,
          name: item.name,
          type: item.type,
          description: item.description,
          isActive: true
        });
      }
      accountMap.set(item.code, acc._id);
    }

    // 2. Ensure all standard account mappings exist
    for (const mapping of DEFAULT_MAPPINGS) {
      const accId = accountMap.get(mapping.code);
      if (accId) {
        const existing = await AccountMapping.findOne({ tenantId, key: mapping.key });
        if (!existing) {
          await AccountMapping.create({
            tenantId,
            key: mapping.key,
            accountId: accId,
            isActive: true
          });
        }
      }
    }
  }

  /**
   * Safe mapping resolver with auto-provisioning fallback
   */
  static async getAccount(key, tenantId) {
    try {
      return await AccountingService.getAccountMapping(key, tenantId);
    } catch {
      await this.ensureDefaultAccounts(tenantId);
      const fallbackMapping = DEFAULT_MAPPINGS.find(m => m.key === key);
      if (fallbackMapping) {
        const acc = await Account.findOne({ tenantId, code: fallbackMapping.code });
        if (acc) return acc._id;
      }
      throw new Error(`Unable to resolve Chart of Accounts mapping for: ${key}`);
    }
  }

  /**
   * 1. Auto-Post B2B Tax Invoice
   * Trigger: Invoice Approved / Sent / Issued
   * Entry:
   *   Dr. Accounts Receivable (Grand Total)
   *   Cr. Sales Revenue (Subtotal)
   *   Cr. Tax Payable (Tax Total)
   */
  static async postSalesInvoice(invoice, userId) {
    try {
      const tenantId = invoice.tenantId;
      await this.ensureDefaultAccounts(tenantId);

      // Check if already posted
      const existing = await JournalEntry.findOne({
        tenantId,
        sourceId: invoice._id,
        sourceModel: 'TaxInvoice',
        status: 'POSTED'
      });
      if (existing) return existing;

      const grandTotal = AccountingService.round(invoice.grandTotal || 0);
      const taxTotal = AccountingService.round(invoice.taxTotal || 0);
      const subtotal = AccountingService.round(grandTotal - taxTotal);

      if (grandTotal <= 0) return null;

      const arAccount = await this.getAccount('ACCOUNTS_RECEIVABLE', tenantId);
      const salesAccount = await this.getAccount('SALES_REVENUE', tenantId);
      const taxAccount = await this.getAccount('TAX_PAYABLE', tenantId);

      const lines = [
        {
          accountId: arAccount,
          debit: grandTotal,
          credit: 0,
          description: `Accounts Receivable for Invoice ${invoice.invoiceNumber}`
        }
      ];

      if (subtotal > 0) {
        lines.push({
          accountId: salesAccount,
          debit: 0,
          credit: subtotal,
          description: `Sales Revenue for Invoice ${invoice.invoiceNumber}`
        });
      }

      if (taxTotal > 0) {
        lines.push({
          accountId: taxAccount,
          debit: 0,
          credit: taxTotal,
          description: `Output GST for Invoice ${invoice.invoiceNumber}`
        });
      }

      // If grandTotal was somehow non-zero but subtotal was 0, ensure credit balances
      const totalCredit = lines.slice(1).reduce((sum, l) => sum + (l.credit || 0), 0);
      if (AccountingService.round(totalCredit) !== grandTotal) {
        const diff = AccountingService.round(grandTotal - totalCredit);
        lines[1].credit = AccountingService.round((lines[1].credit || 0) + diff);
      }

      const entry = await AccountingService.createJournalEntry({
        description: `Tax Invoice #${invoice.invoiceNumber} - ${invoice.customerSnapshot?.name || 'Customer'}`,
        reference: invoice.invoiceNumber,
        date: invoice.issueDate || new Date(),
        sourceId: invoice._id,
        sourceModel: 'TaxInvoice',
        legalCompanyId: invoice.legalCompanyId,
        status: 'POSTED',
        lines
      }, tenantId, userId);

      console.log(`[ACCOUNTING AUTO-POST] Tax Invoice ${invoice.invoiceNumber} -> JE #${entry._id}`);
      return entry;
    } catch (err) {
      console.error(`[ACCOUNTING AUTO-POST ERROR] Tax Invoice ${invoice?.invoiceNumber}:`, err.message);
      return null;
    }
  }

  /**
   * 2. Auto-Post Customer Payment Receipt
   * Trigger: Payment Received for Tax Invoice
   * Entry:
   *   Dr. Bank / Cash (Amount)
   *   Cr. Accounts Receivable (Amount)
   */
  static async postSalesPayment(payment, userId) {
    try {
      const tenantId = payment.tenantId;
      await this.ensureDefaultAccounts(tenantId);

      const existing = await JournalEntry.findOne({
        tenantId,
        sourceId: payment._id,
        sourceModel: 'PaymentReceipt',
        status: 'POSTED'
      });
      if (existing) return existing;

      const amount = AccountingService.round(payment.amount || 0);
      if (amount <= 0) return null;

      const isCash = String(payment.paymentMethod).toUpperCase().includes('CASH');
      const depositAccount = await this.getAccount(isCash ? 'CASH' : 'BANK', tenantId);
      const arAccount = await this.getAccount('ACCOUNTS_RECEIVABLE', tenantId);

      const lines = [
        {
          accountId: depositAccount,
          debit: amount,
          credit: 0,
          description: `Payment Receipt ${payment.receiptNumber} (${payment.paymentMethod})`
        },
        {
          accountId: arAccount,
          debit: 0,
          credit: amount,
          description: `Clear Accounts Receivable for Receipt ${payment.receiptNumber}`
        }
      ];

      const entry = await AccountingService.createJournalEntry({
        description: `Customer Payment Receipt #${payment.receiptNumber}`,
        reference: payment.receiptNumber || payment.referenceNumber,
        date: payment.paymentDate || new Date(),
        sourceId: payment._id,
        sourceModel: 'PaymentReceipt',
        status: 'POSTED',
        lines
      }, tenantId, userId);

      console.log(`[ACCOUNTING AUTO-POST] Payment Receipt ${payment.receiptNumber} -> JE #${entry._id}`);
      return entry;
    } catch (err) {
      console.error(`[ACCOUNTING AUTO-POST ERROR] Payment Receipt ${payment?.receiptNumber}:`, err.message);
      return null;
    }
  }

  /**
   * 3. Auto-Post GRN (Goods Receipt Note)
   * Trigger: GRN Validated & Stock committed to warehouse
   * Entry:
   *   Dr. Inventory / Stock on Hand (Total Inward Valuation)
   *   Cr. GR/IR Clearing Account (Provisional Unbilled Liability)
   */
  static async postGRN(grn, userId) {
    try {
      const tenantId = grn.tenantId;
      await this.ensureDefaultAccounts(tenantId);

      const existing = await JournalEntry.findOne({
        tenantId,
        sourceId: grn._id,
        sourceModel: 'GRN',
        status: 'POSTED'
      });
      if (existing) return existing;

      // Calculate total inward cost valuation
      let totalCost = 0;
      if (Array.isArray(grn.items)) {
        for (const item of grn.items) {
          const qty = Number(item.acceptedQuantity || 0);
          const price = Number(item.unitPrice || item.purchasePrice || item.baseLandedCost || item.costPrice || 0);
          totalCost += qty * price;
        }
      }
      totalCost = AccountingService.round(totalCost || grn.totalCost || 0);

      // If cost is 0 (e.g. not entered in GRN), fallback to nominal 1 per unit or abort
      if (totalCost <= 0) {
        let totalQty = 0;
        grn.items?.forEach(i => totalQty += (i.acceptedQuantity || 0));
        totalCost = AccountingService.round(totalQty * 100); // Nominal base
      }

      if (totalCost <= 0) return null;

      const inventoryAccount = await this.getAccount('INVENTORY', tenantId);
      const grirAccount = await this.getAccount('GRIR_CLEARING', tenantId);

      const lines = [
        {
          accountId: inventoryAccount,
          debit: totalCost,
          credit: 0,
          description: `Inventory Inward from GRN ${grn.grnNumber}`
        },
        {
          accountId: grirAccount,
          debit: 0,
          credit: totalCost,
          description: `GR/IR Accrual for GRN ${grn.grnNumber}`
        }
      ];

      const entry = await AccountingService.createJournalEntry({
        description: `Goods Receipt Note #${grn.grnNumber}`,
        reference: grn.grnNumber,
        date: grn.receiptDate || new Date(),
        sourceId: grn._id,
        sourceModel: 'GRN',
        legalCompanyId: grn.legalCompanyId,
        status: 'POSTED',
        lines
      }, tenantId, userId);

      console.log(`[ACCOUNTING AUTO-POST] GRN ${grn.grnNumber} -> JE #${entry._id}`);
      return entry;
    } catch (err) {
      console.error(`[ACCOUNTING AUTO-POST ERROR] GRN ${grn?.grnNumber}:`, err.message);
      return null;
    }
  }

  /**
   * 4. Auto-Post Vendor Bill (Purchase Tax Invoice)
   * Trigger: Vendor Bill Posted
   * Entry:
   *   Dr. GR/IR Clearing Account (Subtotal - Clears GRN provisional liability)
   *   Dr. Input GST / Tax Credit (Tax Amount)
   *   Cr. Accounts Payable (Grand Total - Actual Vendor Liability)
   */
  static async postVendorBill(bill, userId) {
    try {
      const tenantId = bill.tenantId;
      await this.ensureDefaultAccounts(tenantId);

      const existing = await JournalEntry.findOne({
        tenantId,
        sourceId: bill._id,
        sourceModel: 'VendorBill',
        status: 'POSTED'
      });
      if (existing) return existing;

      const grandTotal = AccountingService.round(bill.grandTotal || 0);
      const taxTotal = AccountingService.round(bill.taxTotal || 0);
      const subtotal = AccountingService.round(grandTotal - taxTotal);

      if (grandTotal <= 0) return null;

      const grirAccount = await this.getAccount('GRIR_CLEARING', tenantId);
      const taxReceivableAccount = await this.getAccount('TAX_RECEIVABLE', tenantId);
      const apAccount = await this.getAccount('ACCOUNTS_PAYABLE', tenantId);

      const lines = [
        {
          accountId: grirAccount,
          debit: subtotal > 0 ? subtotal : grandTotal,
          credit: 0,
          description: `Clear GR/IR for Vendor Bill ${bill.billNumber}`
        }
      ];

      if (taxTotal > 0 && subtotal > 0) {
        lines.push({
          accountId: taxReceivableAccount,
          debit: taxTotal,
          credit: 0,
          description: `Input GST Credit for Bill ${bill.billNumber}`
        });
      }

      lines.push({
        accountId: apAccount,
        debit: 0,
        credit: grandTotal,
        description: `Accounts Payable to Vendor for Bill ${bill.billNumber}`
      });

      // Verify mathematical balance
      const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
      if (AccountingService.round(totalDebit) !== grandTotal) {
        lines[0].debit = AccountingService.round(grandTotal - (taxTotal || 0));
      }

      const entry = await AccountingService.createJournalEntry({
        description: `Vendor Bill #${bill.billNumber}`,
        reference: bill.vendorInvoiceNumber || bill.billNumber,
        date: bill.billDate || new Date(),
        sourceId: bill._id,
        sourceModel: 'VendorBill',
        legalCompanyId: bill.legalCompanyId,
        status: 'POSTED',
        lines
      }, tenantId, userId);

      console.log(`[ACCOUNTING AUTO-POST] Vendor Bill ${bill.billNumber} -> JE #${entry._id}`);
      return entry;
    } catch (err) {
      console.error(`[ACCOUNTING AUTO-POST ERROR] Vendor Bill ${bill?.billNumber}:`, err.message);
      return null;
    }
  }

  /**
   * 5. Auto-Post Vendor Payment
   * Trigger: Payment sent to Supplier
   * Entry:
   *   Dr. Accounts Payable (Amount)
   *   Cr. Bank / Cash (Amount)
   */
  static async postVendorPayment(payment, userId) {
    try {
      const tenantId = payment.tenantId;
      await this.ensureDefaultAccounts(tenantId);

      const existing = await JournalEntry.findOne({
        tenantId,
        sourceId: payment._id,
        sourceModel: 'VendorPayment',
        status: 'POSTED'
      });
      if (existing) return existing;

      const amount = AccountingService.round(payment.amount || 0);
      if (amount <= 0) return null;

      const isCash = String(payment.paymentMethod).toUpperCase().includes('CASH');
      const creditAccount = await this.getAccount(isCash ? 'CASH' : 'BANK', tenantId);
      const apAccount = await this.getAccount('ACCOUNTS_PAYABLE', tenantId);

      const lines = [
        {
          accountId: apAccount,
          debit: amount,
          credit: 0,
          description: `Discharge Accounts Payable - Vendor Payment ${payment.paymentNumber}`
        },
        {
          accountId: creditAccount,
          debit: 0,
          credit: amount,
          description: `Bank/Cash outflow for Vendor Payment ${payment.paymentNumber}`
        }
      ];

      const entry = await AccountingService.createJournalEntry({
        description: `Vendor Payment #${payment.paymentNumber}`,
        reference: payment.paymentNumber || payment.reference,
        date: payment.paymentDate || new Date(),
        sourceId: payment._id,
        sourceModel: 'VendorPayment',
        status: 'POSTED',
        lines
      }, tenantId, userId);

      console.log(`[ACCOUNTING AUTO-POST] Vendor Payment ${payment.paymentNumber} -> JE #${entry._id}`);
      return entry;
    } catch (err) {
      console.error(`[ACCOUNTING AUTO-POST ERROR] Vendor Payment ${payment?.paymentNumber}:`, err.message);
      return null;
    }
  }

  /**
   * 6. Auto-Post POS Retail Order
   * Trigger: Counter Sale finalized
   * Entry:
   *   Dr. Cash in Drawer / Bank POS Card Clearing (Grand Total)
   *   Cr. POS Retail Sales (Subtotal)
   *   Cr. Output Tax Payable (Tax)
   */
  static async postPOSOrder(order, userId) {
    try {
      const tenantId = order.tenantId;
      await this.ensureDefaultAccounts(tenantId);

      const existing = await JournalEntry.findOne({
        tenantId,
        sourceId: order._id,
        sourceModel: 'POSOrder',
        status: 'POSTED'
      });
      if (existing) return existing;

      const grandTotal = AccountingService.round(order.totalAmount || order.grandTotal || 0);
      const taxTotal = AccountingService.round(order.taxTotal || order.taxAmount || 0);
      const subtotal = AccountingService.round(grandTotal - taxTotal);

      if (grandTotal <= 0) return null;

      const isCash = String(order.paymentMethod || 'CASH').toUpperCase().includes('CASH');
      const depositAccount = await this.getAccount(isCash ? 'CASH' : 'BANK', tenantId);
      const posRevenueAccount = await this.getAccount('POS_REVENUE', tenantId);
      const taxAccount = await this.getAccount('TAX_PAYABLE', tenantId);

      const lines = [
        {
          accountId: depositAccount,
          debit: grandTotal,
          credit: 0,
          description: `POS Collection (${order.paymentMethod || 'CASH'}) - Order ${order.orderNumber}`
        }
      ];

      if (subtotal > 0) {
        lines.push({
          accountId: posRevenueAccount,
          debit: 0,
          credit: subtotal,
          description: `POS Retail Sales - Order ${order.orderNumber}`
        });
      }

      if (taxTotal > 0) {
        lines.push({
          accountId: taxAccount,
          debit: 0,
          credit: taxTotal,
          description: `Output GST for POS Order ${order.orderNumber}`
        });
      }

      // Balance safeguard
      const totalCredit = lines.slice(1).reduce((s, l) => s + (l.credit || 0), 0);
      if (AccountingService.round(totalCredit) !== grandTotal) {
        lines[1].credit = AccountingService.round(grandTotal - (taxTotal || 0));
      }

      const entry = await AccountingService.createJournalEntry({
        description: `POS Retail Sale #${order.orderNumber}`,
        reference: order.orderNumber,
        date: order.createdAt || new Date(),
        sourceId: order._id,
        sourceModel: 'POSOrder',
        status: 'POSTED',
        lines
      }, tenantId, userId);

      console.log(`[ACCOUNTING AUTO-POST] POS Order ${order.orderNumber} -> JE #${entry._id}`);
      return entry;
    } catch (err) {
      console.error(`[ACCOUNTING AUTO-POST ERROR] POS Order ${order?.orderNumber}:`, err.message);
      return null;
    }
  }

  /**
   * 7. Auto-Post E-Commerce Online Web Order
   * Trigger: Customer places and confirms order
   * Entry:
   *   Dr. Gateway Clearing (Online) or Cash/COD Receivable
   *   Cr. E-Commerce Sales Revenue
   *   Cr. Output Tax Payable
   */
  static async postEcommerceOrder(order, userId) {
    try {
      const tenantId = order.tenantId;
      await this.ensureDefaultAccounts(tenantId);

      const existing = await JournalEntry.findOne({
        tenantId,
        sourceId: order._id,
        sourceModel: 'EcommerceOrder',
        status: 'POSTED'
      });
      if (existing) return existing;

      const grandTotal = AccountingService.round(order.totalAmount || 0);
      const taxTotal = AccountingService.round(order.taxAmount || 0);
      const subtotal = AccountingService.round(grandTotal - taxTotal);

      if (grandTotal <= 0) return null;

      const isCOD = String(order.paymentMethod).toUpperCase() === 'COD';
      const receivableAccount = await this.getAccount(isCOD ? 'ACCOUNTS_RECEIVABLE' : 'GATEWAY_CLEARING', tenantId);
      const ecomRevenueAccount = await this.getAccount('ECOMMERCE_REVENUE', tenantId);
      const taxAccount = await this.getAccount('TAX_PAYABLE', tenantId);

      const orderRef = `WEB-${order._id.toString().slice(-6).toUpperCase()}`;

      const lines = [
        {
          accountId: receivableAccount,
          debit: grandTotal,
          credit: 0,
          description: `E-Commerce Receipt (${order.paymentMethod || 'ONLINE'}) - ${orderRef}`
        }
      ];

      if (subtotal > 0) {
        lines.push({
          accountId: ecomRevenueAccount,
          debit: 0,
          credit: subtotal,
          description: `E-Commerce Sales Revenue - ${orderRef}`
        });
      }

      if (taxTotal > 0) {
        lines.push({
          accountId: taxAccount,
          debit: 0,
          credit: taxTotal,
          description: `Output Tax - ${orderRef}`
        });
      }

      // Balance check
      const totalCredit = lines.slice(1).reduce((s, l) => s + (l.credit || 0), 0);
      if (AccountingService.round(totalCredit) !== grandTotal) {
        lines[1].credit = AccountingService.round(grandTotal - (taxTotal || 0));
      }

      const entry = await AccountingService.createJournalEntry({
        description: `E-Commerce Online Order #${orderRef}`,
        reference: orderRef,
        date: order.createdAt || new Date(),
        sourceId: order._id,
        sourceModel: 'EcommerceOrder',
        status: 'POSTED',
        lines
      }, tenantId, userId);

      console.log(`[ACCOUNTING AUTO-POST] E-Commerce Order ${orderRef} -> JE #${entry._id}`);
      return entry;
    } catch (err) {
      console.error(`[ACCOUNTING AUTO-POST ERROR] E-Commerce Order ${order?._id}:`, err.message);
      return null;
    }
  }

  /**
   * 8. Reverse Source Journal Entry
   * Trigger: Invoice Cancelled / Voided, POS Order Voided, Bill Cancelled
   */
  static async reverseSourceEntry(sourceId, sourceModel, tenantId, userId) {
    try {
      const activeEntry = await JournalEntry.findOne({
        tenantId,
        sourceId,
        sourceModel,
        status: 'POSTED'
      });

      if (!activeEntry) return null;

      const reversal = await AccountingService.reverseJournalEntry(activeEntry._id, tenantId, userId);
      console.log(`[ACCOUNTING AUTO-REVERSE] Reversed JE #${activeEntry._id} -> New Reversal JE #${reversal._id}`);
      return reversal;
    } catch (err) {
      console.error(`[ACCOUNTING AUTO-REVERSE ERROR] Source ${sourceModel} ${sourceId}:`, err.message);
      return null;
    }
  }
}

module.exports = AutoPostingService;
