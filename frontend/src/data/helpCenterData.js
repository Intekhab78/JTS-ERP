/**
 * JTS ERP - Comprehensive Multi-Module Help Center Data & SOP Guides
 * Contains extensive documentation, feature breakdowns, step-by-step SOPs, FAQs, and tips for every module.
 */

export const HELP_MODULES = [
  {
    id: 'sales',
    title: 'Sales & POS Management',
    category: 'Core Operations',
    icon: 'ShoppingCart',
    badge: 'Retail & B2B',
    color: 'from-blue-600 to-indigo-700',
    accentColor: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-900',
    summary: 'Manage counter retail sales with fast touch POS, barcode scanning, split payments, quotations, sales orders, proforma, delivery challans, tax invoices, and sales returns.',
    liveRoute: '/pos',
    submodules: [
      {
        id: 'pos_terminal',
        name: 'Point of Sale (POS Terminal)',
        path: '/pos',
        purpose: 'High-speed retail billing interface designed for barcode scanners, touchscreens, and rapid checkout.',
        keyFeatures: [
          'Instant product search by Name, SKU, or Barcode scan.',
          'Multi-tender split payments (Cash, Credit Card, UPI QR, Customer Store Credit / Wallet).',
          'Quick customer attachment with loyalty and credit limit check.',
          'Line-item and overall cart discount with role-based manager authorization.',
          'Park / Hold cart for customer queue management and instant recall.',
          'Direct thermal receipt printing (80mm / 58mm).'
        ],
        actionsExplained: [
          { action: 'Hold Cart (F4)', desc: 'Temporarily saves current customer basket so you can bill the next person in queue.' },
          { action: 'Recall Cart', desc: 'Opens list of paused carts and restores all items back to register.' },
          { action: 'Add Customer', desc: 'Attaches customer name/mobile to order for invoice history and credit billing.' },
          { action: 'Apply Discount', desc: 'Allows percentage (%) or fixed (₹) discount. Prompts Manager PIN if exceeding cashier limit.' },
          { action: 'Pay / Tender (F8)', desc: 'Opens payment modal to split amount between Cash, Card, UPI or Wallet.' }
        ]
      },
      {
        id: 'pos_sessions',
        name: 'POS Sessions & Cash Drawer Management',
        path: '/pos/sessions',
        purpose: 'Controls shift opening, cash floats, cashier accountability, and day-end drawer reconciliation.',
        keyFeatures: [
          'Shift Opening Float: Cashier enters starting cash in drawer.',
          'Mid-day Cash In / Cash Out: Logs petty cash payments or cash drops.',
          'Shift Closing & Reconciliation: Compares expected cash (sales + opening float) against physical counted cash.',
          'Discrepancy (Over / Short) tracking with mandatory cashier remarks.'
        ],
        actionsExplained: [
          { action: 'Open Session', desc: 'Enter starting cash float and activate POS terminal for billing.' },
          { action: 'Cash In / Out', desc: 'Record cash deposits or withdrawals from drawer with reason.' },
          { action: 'Close Session & Reconcile', desc: 'Cashier counts physical cash; system generates Z-Report showing cash, card, UPI totals and variance.' }
        ]
      },
      {
        id: 'quotations',
        name: 'Quotations & Estimates',
        path: '/sales/quotes',
        purpose: 'Generate professional price quotes for B2B prospects with expiry dates and terms.',
        keyFeatures: [
          'Auto price calculation based on customer tier / price lists.',
          '1-Click Conversion: Convert accepted quote into a confirmed Sales Order or Tax Invoice without retyping.',
          'Export PDF or send via Email directly.'
        ],
        actionsExplained: [
          { action: 'Convert to Sales Order', desc: 'Creates a binding sales order and reserves warehouse stock.' },
          { action: 'Convert to Tax Invoice', desc: 'Generates a final legal tax invoice and records receivable.' }
        ]
      },
      {
        id: 'sales_orders',
        name: 'Sales Orders',
        path: '/sales',
        purpose: 'Tracks confirmed customer orders, backorders, and allocation of inventory before dispatch.',
        keyFeatures: [
          'Automated stock reservation across selected warehouse branches.',
          'Tracks order fulfillment stages: Draft ➔ Confirmed ➔ Picked ➔ Dispatched ➔ Invoiced.',
          'Payment status tracking (Unpaid, Partially Paid, Fully Paid).'
        ]
      },
      {
        id: 'delivery_notes',
        name: 'Delivery Notes (Challan)',
        path: '/sales/delivery-notes',
        purpose: 'Official dispatch document accompanying goods in transit to customer locations.',
        keyFeatures: [
          'Physical stock deduction from warehouse upon dispatch.',
          'Transporter name, vehicle number, and LR / E-Way bill recording.',
          'Receiver signature acknowledgment upload.'
        ]
      },
      {
        id: 'tax_invoices',
        name: 'Tax Invoices',
        path: '/sales/tax-invoices',
        purpose: 'Legal GST/VAT accounting document establishing customer debit and sales revenue.',
        keyFeatures: [
          'Automatic HSN/SAC code population and GST tax slab calculation (CGST + SGST or IGST).',
          'Customer ledger posting in Accounts module in real-time.',
          'Print formatted GST tax invoices with QR codes.'
        ]
      },
      {
        id: 'sales_returns',
        name: 'Sales Returns & Credit Notes',
        path: '/sales/returns',
        purpose: 'Handles B2B product returns against existing tax invoices.',
        keyFeatures: [
          'Selects original invoice to prevent fraudulent or over-returns.',
          'Restocks returned items back to warehouse branch.',
          'Generates Credit Note (debiting sales, crediting customer account).'
        ]
      }
    ],
    workflows: [
      {
        title: 'Complete Retail POS Shift Flow (Open ➔ Sell ➔ Close)',
        time: '3-5 Minutes',
        difficulty: 'Easy',
        steps: [
          {
            stepNumber: 1,
            title: 'Open POS Session',
            description: 'Navigate to Sales ➔ POS Sessions ➔ Click "Start New Session". Enter the opening cash float present in the drawer (e.g. ₹2,000) and click Confirm.',
            tip: 'Always physically count the opening cash float to avoid day-end discrepancies.'
          },
          {
            stepNumber: 2,
            title: 'Scan Items & Bill Customers',
            description: 'On POS Terminal screen, scan barcodes or click item cards. Use Search bar to quickly filter products. Adjust quantities and select customer name if credit or loyalty is needed.',
            tip: 'Use keyboard shortcut F4 to hold cart if a customer forgot their wallet.'
          },
          {
            stepNumber: 3,
            title: 'Tender Payment',
            description: 'Press F8 or click "Pay". Select Tender mode: Cash, Card, UPI, or Split across multiple modes. Enter amount received and click "Complete Sale". Receipt prints automatically.',
            tip: 'If UPI is chosen, customer can scan the dynamic on-screen QR code.'
          },
          {
            stepNumber: 4,
            title: 'End of Day Shift Closure',
            description: 'At end of day, click "Close Session" in top right. Enter physical cash counted in drawer. Review the summary showing Total Cash, Card, and UPI. Click "Reconcile & Close".',
            tip: 'Any difference between calculated and counted cash is permanently logged in the audit ledger.'
          }
        ]
      },
      {
        title: 'B2B Sales Flow: Quote ➔ Order ➔ Delivery ➔ Invoice',
        time: '5-8 Minutes',
        difficulty: 'Intermediate',
        steps: [
          {
            stepNumber: 1,
            title: 'Create Quotation',
            description: 'Go to Sales ➔ Quotations ➔ Click "New Quote". Select customer, branch, add items with agreed rates, and set quotation validity period.',
            tip: 'You can attach standard payment terms and freight policies.'
          },
          {
            stepNumber: 2,
            title: 'Convert to Sales Order',
            description: 'Once customer approves quote, click "Convert to Sales Order". This locks in the stock reservation so the inventory cannot be sold to anyone else.',
            tip: 'Reserved units show up in Inventory Stock Overview as "Reserved".'
          },
          {
            stepNumber: 3,
            title: 'Generate Delivery Note (Challan)',
            description: 'When warehouse packs the order, click "Generate Delivery Note". Add vehicle number and driver name. This deducts stock from physical warehouse inventory.',
            tip: 'Print 2 copies of Delivery Note: 1 for driver, 1 for customer acknowledgment.'
          },
          {
            stepNumber: 4,
            title: 'Issue Tax Invoice',
            description: 'Click "Generate Tax Invoice" against the delivery note. System automatically applies HSN GST rates and credits Sales Revenue while debiting Customer Account.',
            tip: 'The invoice automatically reflects in Customer Aging & Outstanding Reports.'
          }
        ]
      }
    ],
    faqs: [
      {
        q: 'How do I give a discount on POS without manager PIN?',
        a: 'Cashiers have a maximum allowed discount percentage configured in Roles & Permissions. If the discount exceeds their threshold, the system displays a Manager Approval popup requesting a manager PIN.'
      },
      {
        q: 'Can I do a partial return of only 1 item from an invoice?',
        a: 'Yes. In POS Returns or Sales Returns, select the invoice and specify quantity "1" for the specific item being returned. The remaining items stay untouched.'
      },
      {
        q: 'What happens if a POS session has a cash shortage?',
        a: 'When closing the session, if counted cash is less than expected cash, system logs a negative variance (Shortage) and creates a variance ledger entry for management review.'
      }
    ],
    tips: [
      'Press [F2] in POS to focus directly on the barcode search bar.',
      'Press [F4] to park/hold the current customer cart.',
      'Press [F8] for 1-touch jump to the Tender Payment modal.',
      'Double click any quantity in the POS cart to quickly change quantity.'
    ]
  },

  {
    id: 'purchase',
    title: 'Purchase & Procurement',
    category: 'Supply Chain',
    icon: 'ShoppingBag',
    badge: 'Procurement',
    color: 'from-amber-600 to-orange-700',
    accentColor: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-900',
    summary: 'Streamline the entire supply chain from RFQs, Supplier Purchase Orders, Goods Receipt Notes (GRN), 3-way invoice matching, Vendor Bills, and Consignment stock.',
    liveRoute: '/purchases',
    submodules: [
      {
        id: 'suppliers',
        name: 'Suppliers & Vendors Master',
        path: '/suppliers',
        purpose: 'Maintain complete vendor directory, payment terms, tax registration numbers, and purchase history.',
        keyFeatures: [
          'GST / Tax identification number recording with verification.',
          'Payment terms (e.g. Net 15, Net 30, Advance, Cash on Delivery).',
          'Primary contact person, mobile, billing address, and bank payout details.',
          'Real-time Vendor Ledger Balance & Aging summary.'
        ]
      },
      {
        id: 'rfqs',
        name: 'Requests for Quotation (RFQs)',
        path: '/purchases/rfqs',
        purpose: 'Inquire prices from multiple suppliers for comparison before releasing purchase contracts.',
        keyFeatures: [
          'Send RFQ to multiple suppliers simultaneously.',
          'Side-by-side comparison of supplier unit rates, lead time, and freight.',
          '1-Click conversion of winning bid into a Purchase Order.'
        ]
      },
      {
        id: 'purchase_orders',
        name: 'Purchase Orders (PO)',
        path: '/purchases',
        purpose: 'Legally binding purchase contracts issued to vendors specifying products, quantities, rates, and delivery dates.',
        keyFeatures: [
          'Multi-branch delivery destination selection.',
          'Tracks order receiving progress: Pending ➔ Partially Received ➔ Completed.',
          'Alerts for overdue PO deliveries.'
        ]
      },
      {
        id: 'grn',
        name: 'Goods Receipt Note (GRN)',
        path: '/purchases/grn',
        purpose: 'Warehouse gate-in document confirming physical receipt and quality inspection of goods.',
        keyFeatures: [
          'Mandatory PO linking prevents receiving unauthorized goods.',
          'Records Accepted vs Rejected quantities with rejection reason.',
          'Increases warehouse stock balance immediately upon submission.',
          'Batch / Lot and Expiry date assignment during receipt.'
        ]
      },
      {
        id: 'vendor_bills',
        name: 'Vendor Bills & Accounts Payable',
        path: '/purchases/bills',
        purpose: 'Records supplier commercial invoice and schedules payments in Accounts Payable.',
        keyFeatures: [
          '3-Way Matching: Verifies PO items vs GRN received quantities vs Vendor Bill billed amounts.',
          'Tracks payment due date based on supplier credit terms.',
          'Records payment vouchers (NEFT, RTGS, Cheque, Cash).'
        ]
      },
      {
        id: 'vendor_returns',
        name: 'Vendor Returns (Debit Notes)',
        path: '/purchases/returns',
        purpose: 'Returns rejected or damaged goods back to suppliers and debits payable balance.',
        keyFeatures: [
          'Deducts physical stock from warehouse.',
          'Generates legal Debit Note offsetting supplier balance.'
        ]
      }
    ],
    workflows: [
      {
        title: 'Full 3-Way Matching Procurement Workflow',
        time: '5-10 Minutes',
        difficulty: 'Intermediate',
        steps: [
          {
            stepNumber: 1,
            title: 'Issue Purchase Order (PO)',
            description: 'Go to Purchase ➔ Purchase Orders ➔ "New PO". Select Supplier, destination Branch, add item lines with purchase costs, and specify Expected Delivery Date.',
            tip: 'Always verify supplier GST number before confirming PO.'
          },
          {
            stepNumber: 2,
            title: 'Receive Stock via GRN',
            description: 'When truck arrives at warehouse, open Purchase ➔ Goods Receipt Note (GRN) ➔ Select the PO. Count items and enter "Received Qty". If any items are broken, enter in "Rejected Qty".',
            tip: 'Submitting GRN immediately updates physical inventory in the warehouse.'
          },
          {
            stepNumber: 3,
            title: 'Create Vendor Bill',
            description: 'Go to Vendor Bills ➔ Click "Create from GRN". The system matches quantities from GRN with PO prices, preventing over-billing.',
            tip: '3-way matching guarantees you only pay for what was actually received in good condition.'
          },
          {
            stepNumber: 4,
            title: 'Pay Supplier',
            description: 'Record payment against the bill via Bank Transfer or Cheque. The Accounts module automatically debits Vendor Payable and credits Bank Ledger.',
            tip: 'Payment can be split into multiple partial installments.'
          }
        ]
      }
    ],
    faqs: [
      {
        q: 'Does creating a Purchase Order increase stock balance?',
        a: 'No. A PO is only an agreement. Stock increases only when warehouse submits a Goods Receipt Note (GRN).'
      },
      {
        q: 'What happens when items received in GRN are rejected?',
        a: 'Rejected quantities are NOT added to sellable stock. They are logged under Rejection Records and can be returned via Vendor Returns (Debit Note).'
      }
    ],
    tips: [
      'Always link GRN to the original PO to ensure cost accuracy.',
      'Use Vendor Bills aging report to take advantage of supplier early-payment discounts.'
    ]
  },

  {
    id: 'inventory',
    title: 'Inventory & Warehousing',
    category: 'Core Operations',
    icon: 'Package',
    badge: 'Multi-Location',
    color: 'from-emerald-600 to-teal-700',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-900',
    summary: 'Real-time multi-branch stock visibility, product SKU management, inter-warehouse transfers, physical stock adjustments, and immutable movement audit trails.',
    liveRoute: '/inventory/overview',
    submodules: [
      {
        id: 'stock_overview',
        name: 'Stock Overview & Valuation',
        path: '/inventory/overview',
        purpose: 'Real-time dashboard showing current inventory quantities, stock valuation, and reorder alerts.',
        keyFeatures: [
          'Filter stock by Branch, Department, Category, or Brand.',
          'Shows On-Hand, Reserved (in pending orders), and Available to Sell.',
          'Low stock warning badges when stock falls below reorder threshold.',
          'Total inventory asset valuation calculated at Weighted Average Cost.'
        ]
      },
      {
        id: 'products_master',
        name: 'Products Master',
        path: '/inventory',
        purpose: 'Central repository of all sellable and raw material items with SKUs, barcodes, and specs.',
        keyFeatures: [
          'SKU & Barcode assignment with barcode label printing.',
          'Retail Sales Price, Cost Price, and Minimum Selling Price guards.',
          'Unit of Measurement (UOM) with conversions (e.g., Box of 12).',
          'Matrix variants (Size & Color combinations) support.'
        ]
      },
      {
        id: 'stock_transfers',
        name: 'Inter-Branch Stock Transfers',
        path: '/inventory/transfers',
        purpose: 'Manages physical movement of inventory between branches and central warehouses.',
        keyFeatures: [
          '2-Step Secure Transfer: Dispatched from Source ➔ Received at Destination.',
          'In-Transit tracking prevents inventory loss during transit.',
          'Transit damage / discrepancy reconciliation.'
        ]
      },
      {
        id: 'stock_adjustments',
        name: 'Stock Adjustments (Cycle Counts)',
        path: '/inventory/adjustments',
        purpose: 'Reconciles physical count with system books for stocktakes, breakage, or expiry write-offs.',
        keyFeatures: [
          'Supports Increase (surplus found) or Decrease (breakage/theft/write-off).',
          'Reason codes (Damaged, Theft, Expired, Periodic Audit Count).',
          'Generates Inventory Adjustment Expense entry in Accounts.'
        ]
      },
      {
        id: 'stock_movements',
        name: 'Stock Movements Ledger',
        path: '/inventory/movements',
        purpose: 'Immutable audit log tracking every single inbound and outbound transaction.',
        keyFeatures: [
          'Logs Date, Time, User, Reference # (Invoice, PO, Transfer), and Net Change.',
          'Full traceability for auditing and fraud detection.'
        ]
      }
    ],
    workflows: [
      {
        title: 'Inter-Branch Stock Transfer (Warehouse ➔ Retail Outlet)',
        time: '4 Minutes',
        difficulty: 'Easy',
        steps: [
          {
            stepNumber: 1,
            title: 'Initiate Transfer Order',
            description: 'Go to Inventory ➔ Transfers ➔ "New Transfer". Select Source Branch (e.g. Central Warehouse) and Destination Branch (e.g. Retail Outlet 1).',
            tip: 'Ensure the source branch has sufficient available stock.'
          },
          {
            stepNumber: 2,
            title: 'Add Items & Dispatch',
            description: 'Scan or select items and enter transfer quantities. Click "Dispatch Transfer". Stock moves to "In-Transit" status.',
            tip: 'Print Transfer Challan to accompany the vehicle.'
          },
          {
            stepNumber: 3,
            title: 'Receive at Destination Branch',
            description: 'When goods arrive at receiving branch, store manager opens the transfer order and clicks "Confirm Receipt".',
            tip: 'Stock immediately becomes available for billing at the destination branch.'
          }
        ]
      }
    ],
    faqs: [
      {
        q: 'What is the difference between On-Hand and Available stock?',
        a: 'On-Hand is physical stock inside the warehouse. Available stock is On-Hand minus Reserved stock (units currently in pending web orders or unfulfilled sales orders).'
      },
      {
        q: 'Can a product have multiple barcodes?',
        a: 'Yes, product variants can each have unique barcodes, and alternate barcodes can be assigned for supplier UPC codes.'
      }
    ],
    tips: [
      'Run periodic cycle counts using Stock Adjustments instead of doing full annual shutdowns.',
      'Check the Stock Movement ledger whenever a product balance seems unexpected.'
    ]
  },

  {
    id: 'accounts',
    title: 'Accounts & Finance',
    category: 'Finance & Compliance',
    icon: 'BookOpen',
    badge: 'Double-Entry',
    color: 'from-cyan-600 to-blue-800',
    accentColor: 'text-cyan-600 dark:text-cyan-400',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-900',
    summary: 'Standard double-entry accounting with Chart of Accounts, automated ledger postings from Sales/Purchases/Payroll, Journal Vouchers, P&L, and Balance Sheet.',
    liveRoute: '/accounts',
    submodules: [
      {
        id: 'chart_of_accounts',
        name: 'Chart of Accounts (COA)',
        path: '/accounts',
        purpose: 'Structured master list of all financial accounts grouped into Assets, Liabilities, Equity, Revenue, and Expenses.',
        keyFeatures: [
          '5-tier hierarchical account structure (Header Accounts & Sub-Ledgers).',
          'Opening Balance setup with date-based tracking.',
          'Real-time debit, credit, and running balance calculation.'
        ]
      },
      {
        id: 'general_journal',
        name: 'General Journal & Vouchers',
        path: '/journal',
        purpose: 'Records manual journal entries for depreciation, accruals, tax adjustments, and bank transfers.',
        keyFeatures: [
          'Enforces balanced double-entry (Total Debits must equal Total Credits).',
          'Document attachment and memo notes support.',
          'Recurring entry templates.'
        ]
      },
      {
        id: 'account_mappings',
        name: 'Automated Account Mappings',
        path: '/account-mappings',
        purpose: 'Maps operational events (Sales, Purchase, Inventory write-offs, Payroll) to default ledger accounts.',
        keyFeatures: [
          'Ensures cashiers and warehouse staff do not need accounting knowledge—the system posts journal vouchers automatically!'
        ]
      }
    ],
    workflows: [
      {
        title: 'How Operational Transactions Post to Accounts Automatically',
        time: 'Overview',
        difficulty: 'Easy',
        steps: [
          {
            stepNumber: 1,
            title: 'Point of Sale (POS) Billing',
            description: 'When a POS sale is completed: Cash/Bank Account is Debited, Sales Revenue Account is Credited, Output GST/Tax is Credited, and Cost of Goods Sold (COGS) is Debited while Inventory Asset is Credited.',
            tip: 'Zero manual ledger entry required!'
          },
          {
            stepNumber: 2,
            title: 'Vendor Bill Entry',
            description: 'When a Vendor Bill is saved: Inventory Asset (or Purchase Expense) is Debited, Input Tax Credit is Debited, and Accounts Payable (Supplier Ledger) is Credited.',
            tip: 'Linked directly with 3-way matching.'
          }
        ]
      }
    ],
    faqs: [
      {
        q: 'Can I delete a posted journal entry?',
        a: 'No. To maintain audit compliance, posted entries cannot be deleted. You can create a Reversal Journal Entry to correct errors.'
      }
    ],
    tips: [
      'Check Account Mappings whenever adding new revenue streams or tax slabs.',
      'Reconcile Bank Statements weekly with Bank Ledger entries.'
    ]
  },

  {
    id: 'hr_payroll',
    title: 'HR & Payroll Management',
    category: 'Human Resources',
    icon: 'Users',
    badge: 'Automated Payroll',
    color: 'from-purple-600 to-indigo-800',
    accentColor: 'text-purple-600 dark:text-purple-400',
    bgLight: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-900',
    summary: 'Comprehensive employee lifecycle management, attendance, leave approvals, salary structure templates, 1-click batch payroll calculation, payslips, and compliance reports.',
    liveRoute: '/employees',
    submodules: [
      {
        id: 'employees',
        name: 'Employee Directory',
        path: '/employees',
        purpose: 'Master directory of all staff, job designations, salary structures, department, and bank details.',
        keyFeatures: [
          'Personal, contact, and statutory identity details (PAN, Aadhaar, Passport).',
          'Bank payout details for automated NEFT salary disbursement.',
          'Assigned Salary Structure with component breakdown.'
        ]
      },
      {
        id: 'attendance',
        name: 'Daily Attendance & Shifts',
        path: '/attendance',
        purpose: 'Records daily in/out times, overtime hours, late marks, and half-days.',
        keyFeatures: [
          'Biometric and mobile attendance capture.',
          'Shift rules (grace period, overtime calculation).',
          'Automatic feed into monthly payroll engine.'
        ]
      },
      {
        id: 'leave_management',
        name: 'Leaves & Holidays',
        path: '/leave-requests',
        purpose: 'Leave balances, employee time-off applications, manager approvals, and company holiday calendars.',
        keyFeatures: [
          'Leave types: Casual Leave (CL), Sick Leave (SL), Earned Leave (EL), Maternity.',
          'Tracks leave quotas and accruals.',
          'Unpaid leaves automatically calculate Loss of Pay (LOP) deductions in payroll.'
        ]
      },
      {
        id: 'payroll_engine',
        name: 'Payroll Periods & Salary Processing',
        path: '/payroll-periods',
        purpose: '1-click monthly salary batch generation based on real attendance and salary structure rules.',
        keyFeatures: [
          'Earnings calculation: Basic, HRA, Conveyance, Special Allowance, Overtime.',
          'Deductions calculation: PF, ESI, Professional Tax, TDS, Advance recoveries, LOP.',
          'Review ➔ Approve ➔ Lock workflow with audit freeze.',
          'Direct PDF Payslip generation and export to accounts.'
        ]
      }
    ],
    workflows: [
      {
        title: 'Monthly Payroll Processing Workflow',
        time: '5-10 Minutes',
        difficulty: 'Intermediate',
        steps: [
          {
            stepNumber: 1,
            title: 'Verify Monthly Attendance & Leaves',
            description: 'Navigate to HR ➔ Daily Attendance and Leave Requests. Ensure all pending leave applications are approved or rejected before month-end cutoff.',
            tip: 'Unmarked days without approved leaves will count as Loss of Pay (LOP).'
          },
          {
            stepNumber: 2,
            title: 'Open New Payroll Period',
            description: 'Go to HR ➔ Payroll Periods ➔ Click "Create New Period". Select the month (e.g. October 2026), select branch/company, and click "Open Period".',
            tip: 'System locks the dates for attendance fetching.'
          },
          {
            stepNumber: 3,
            title: 'Run Batch Calculation',
            description: 'Click "Calculate Payroll". The engine computes net salary for all active employees using their assigned structures, overtime, and attendance.',
            tip: 'Review the calculation summary grid to inspect variances or anomalies.'
          },
          {
            stepNumber: 4,
            title: 'Approve & Lock Payroll',
            description: 'After HR Manager reviews the totals, click "Approve Period" then "Lock Period". This posts salary payable entries to Accounts and makes payslips visible to employees.',
            tip: 'Once locked, payslips can be downloaded as PDF in bulk.'
          }
        ]
      }
    ],
    faqs: [
      {
        q: 'How does Loss of Pay (LOP) calculate?',
        a: 'The system divides the monthly fixed salary by the total days in the month and multiplies by the number of unapproved absent days to compute the LOP deduction.'
      }
    ],
    tips: [
      'Lock payroll periods promptly to prevent retroactive attendance changes from altering past salary numbers.',
      'Employees can download their own payslips from the Employee Self Service portal.'
    ]
  },

  {
    id: 'ecommerce',
    title: 'E-Commerce & Omnichannel',
    category: 'Digital Storefront',
    icon: 'Globe',
    badge: 'Online Store',
    color: 'from-rose-600 to-pink-700',
    accentColor: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-900',
    summary: 'Central hub connecting the online web storefront with warehouse ERP stock, order fulfillment pipeline, shipping labels, reverse returns, doorstep exchanges, and delivery policies.',
    liveRoute: '/ecommerce/order-processing',
    submodules: [
      {
        id: 'order_processing',
        name: 'Order Processing Pipeline',
        path: '/ecommerce/order-processing',
        purpose: 'Kanban fulfillment pipeline for incoming web orders from placement to doorstep delivery.',
        keyFeatures: [
          'Pipeline stages: Order Placed ➔ Confirmed ➔ Picked & Packed ➔ Shipped ➔ Delivered.',
          'Bulk Rider & Courier assignment with 1-click AWB tracking generation.',
          'Thermal shipping label printing (4x6 inch) with barcodes and customer addresses.',
          'Delivery proof (POD) capture with mobile camera and customer signature pad.'
        ]
      },
      {
        id: 'returns_exchanges',
        name: 'Returns & Doorstep Exchanges',
        path: '/ecommerce/order-processing',
        purpose: 'Comprehensive reverse logistics workflow for customer return refunds and variant swaps.',
        keyFeatures: [
          'Customer initiates return on storefront with reasons and photo proofs.',
          '6-Digit Pickup OTP sent to customer email for secure doorstep handover.',
          'Non-Refundable Delivery Charge: System automatically excludes shipping fees and refunds ONLY the product purchase price.',
          'Doorstep Swap Exchanges: Free replacement delivery with on-spot product price difference collection / wallet credit.',
          'Restock to branch warehouse after Quality Check (QC) inspection.'
        ]
      },
      {
        id: 'ecom_settings',
        name: 'Settings & Delivery Policies',
        path: '/ecommerce/settings',
        purpose: 'Configure store-wide shipping fees, free delivery threshold, and return rules.',
        keyFeatures: [
          'Delivery Charge: Standard shipping fee charged on small carts (e.g. ₹50).',
          'Free Delivery Above: Threshold amount (e.g. ₹499) above which shipping is automatically FREE.',
          'Require Email OTP Verification: Security toggle for customer sign-up.',
          'Allow Customer Cancellations & Return Window Days (e.g. 7 days).'
        ]
      },
      {
        id: 'product_media_catalog',
        name: 'Product Media & Policy Badges',
        path: '/ecommerce/products',
        purpose: 'Manage storefront imagery, variant image sets, and product return policies.',
        keyFeatures: [
          'Set Return Policy per product: Return & Exchange Allowed, Exchange Only, or Non-Returnable.',
          'Storefront displays dynamic badges: "7 Days Replacement Only", "Non-Returnable", or "Free Returns".'
        ]
      }
    ],
    workflows: [
      {
        title: 'Web Order Processing (Placed ➔ Shipped ➔ Delivered)',
        time: '3 Minutes',
        difficulty: 'Easy',
        steps: [
          {
            stepNumber: 1,
            title: 'Review Incoming Order',
            description: 'Go to E-Commerce ➔ Order Processing. New orders appear under "Orders Placed". Review items, address, and payment method.',
            tip: 'COD orders can be verified with customer phone call if required.'
          },
          {
            stepNumber: 2,
            title: 'Assign Rider or Courier',
            description: 'Select order and click "Assign Rider". Choose In-House Delivery Fleet (enter rider name/phone) or 3PL Courier (BlueDart, Delhivery with Tracking AWB).',
            tip: 'Print 4x6 Shipping Label and attach to parcel box.'
          },
          {
            stepNumber: 3,
            title: 'Doorstep Verification & Delivery',
            description: 'Rider opens mobile delivery link, snaps parcel photo (POD), collects customer finger signature, and enters 4-digit Delivery OTP to mark Delivered.',
            tip: 'Status updates in real-time across ERP and Storefront.'
          }
        ]
      },
      {
        title: 'Customer Return & Refund Processing (Excluding Shipping Fee)',
        time: '4 Minutes',
        difficulty: 'Intermediate',
        steps: [
          {
            stepNumber: 1,
            title: 'Customer Submits Return Request',
            description: 'Customer opens My Orders on storefront, clicks "Return Item", selects reason, and chooses refund method (UPI / Bank Account / Store Credit).',
            tip: 'System displays clear notice: Delivery fee is non-refundable; product price will be refunded.'
          },
          {
            stepNumber: 2,
            title: 'Rider Reverse Pickup',
            description: 'Rider goes to customer doorstep. Customer provides the 6-digit Return Pickup OTP sent to their email. Rider verifies item and collects parcel.',
            tip: 'Pickup is 100% free for customer.'
          },
          {
            stepNumber: 3,
            title: 'Warehouse QC & Refund Execution',
            description: 'Admin in ERP reviews returned item condition (Passed Sellable / Damaged) and clicks "Process Refund". System displays Item Subtotal (Refundable), Delivery Fee (-₹50 Non-refundable), and pre-fills net product price. Admin sends refund via UPI/Bank.',
            tip: 'Item is automatically restocked into warehouse inventory.'
          }
        ]
      }
    ],
    faqs: [
      {
        q: 'Why is the delivery charge deducted from the return refund?',
        a: 'Standard e-commerce policy: Shipping charge is a transit service fee already consumed during forward delivery. Hence, only the product purchase price is refundable.'
      },
      {
        q: 'How does an exchange work if the new item costs more?',
        a: 'In a doorstep swap, the rider collects only the net product price difference from the customer. The delivery for the exchange is free.'
      }
    ],
    tips: [
      'Configure Free Delivery Threshold (e.g. ₹499) in Settings to boost average order value (AOV).',
      'Use thermal 4x6 labels with barcodes for fastest dispatch processing.'
    ]
  },

  {
    id: 'hierarchy',
    title: 'Item Hierarchy & Catalog Taxonomy',
    category: 'Inventory Masters',
    icon: 'Layers',
    badge: '4-Tier Taxonomy',
    color: 'from-teal-600 to-emerald-800',
    accentColor: 'text-teal-600 dark:text-teal-400',
    bgLight: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200 dark:border-teal-900',
    summary: 'Structure product catalog across 4 organizational tiers (Department ➔ Category ➔ Family ➔ Sub-Family) alongside Size, Color, and Unit of Measurement (UOM) conversions.',
    liveRoute: '/hierarchy/departments',
    submodules: [
      {
        id: 'taxonomy_tiers',
        name: 'Department, Category, Family, Sub-Family',
        path: '/hierarchy/departments',
        purpose: 'Multi-level catalog classification for granular sales reporting and e-commerce navigation menus.',
        keyFeatures: [
          'Department: Highest tier (e.g. Electronics, Fashion, Hardware).',
          'Category: Major group (e.g. Computers & Laptops, Mobile Phones).',
          'Family: Product line (e.g. Gaming Laptops, Ultrabooks).',
          'Sub-Family: Specific segment (e.g. 15-inch RTX Series).'
        ]
      },
      {
        id: 'uom_master',
        name: 'Unit of Measure (UOM) & Conversions',
        path: '/inventory/uom-master',
        purpose: 'Allows purchasing in bulk units (e.g. Box of 100) and selling in individual retail units (Pcs).',
        keyFeatures: [
          'Base UOM definition (Pcs, Kg, Liter, Meter).',
          'Multiplier conversions: 1 Carton = 24 Boxes, 1 Box = 10 Pcs.',
          'Automatic inventory conversion on PO receipt.'
        ]
      }
    ],
    workflows: [
      {
        title: 'Setting up a New Product Category and Size/Color Matrix',
        time: '3 Minutes',
        difficulty: 'Easy',
        steps: [
          {
            stepNumber: 1,
            title: 'Define Hierarchy',
            description: 'Go to Item Hierarchy ➔ Select Department, then create Category, Family, and Sub-Family.',
            tip: 'Proper hierarchy structure ensures web storefront filters work automatically.'
          },
          {
            stepNumber: 2,
            title: 'Configure Sizes and Colors',
            description: 'Add applicable sizes (S, M, L, XL) and color swatches (Navy Blue #000080, Crimson Red).',
            tip: 'Color hex codes are used directly for variant circles on the e-commerce store.'
          }
        ]
      }
    ],
    faqs: [
      {
        q: 'Can an item belong to multiple categories?',
        a: 'Every SKU has a primary category for accounting and stock classification, but can be tagged in multiple promotional collections.'
      }
    ],
    tips: [
      'Always set up your UOM conversions before creating purchase orders for packaged goods.'
    ]
  },

  {
    id: 'manufacturing',
    title: 'Manufacturing & Production',
    category: 'Production',
    icon: 'Factory',
    badge: 'Assembly & BOM',
    color: 'from-slate-700 to-zinc-900',
    accentColor: 'text-slate-700 dark:text-slate-300',
    bgLight: 'bg-slate-50 dark:bg-slate-900/40',
    borderColor: 'border-slate-300 dark:border-slate-800',
    summary: 'Manage Bill of Materials (BOM), raw material staging, production work orders, labor cost tracking, scrap management, and finished goods warehousing.',
    liveRoute: '/bom',
    submodules: [
      {
        id: 'bom',
        name: 'Bill of Materials (BOM)',
        path: '/bom',
        purpose: 'Recipe/formula defining all raw components, quantities, scrap percentage, and routing required to build 1 finished unit.',
        keyFeatures: [
          'Component quantity formula with scrap tolerance.',
          'Direct labor and machine overhead cost estimation.',
          'Multi-level sub-assembly support.'
        ]
      },
      {
        id: 'work_orders',
        name: 'Manufacturing Work Orders',
        path: '/manufacturing',
        purpose: 'Executes actual factory production runs.',
        keyFeatures: [
          'Raw Material Reservation: Locks required components in inventory.',
          'Component Backflushing: Deducts raw materials upon job completion.',
          'Finished Goods Receipt: Adds completed items into warehouse at calculated production cost.'
        ]
      }
    ],
    workflows: [
      {
        title: 'Production Job Flow: BOM ➔ Work Order ➔ Finished Goods',
        time: '5 Minutes',
        difficulty: 'Intermediate',
        steps: [
          {
            stepNumber: 1,
            title: 'Create Bill of Materials (BOM)',
            description: 'Define finished item and list all raw material SKUs with required quantities.',
            tip: 'Include scrap percentage (e.g. 2%) for cutting or molding loss.'
          },
          {
            stepNumber: 2,
            title: 'Issue Work Order',
            description: 'Create Work Order specifying planned production quantity (e.g. 50 units). System checks raw material availability.',
            tip: 'If raw materials are insufficient, system alerts procurement to issue POs.'
          },
          {
            stepNumber: 3,
            title: 'Complete Production',
            description: 'Enter completed units. System deducts raw materials and receipts finished units into warehouse at exact production cost.',
            tip: 'Cost includes raw material cost + assigned labor.'
          }
        ]
      }
    ],
    faqs: [
      {
        q: 'What happens if actual raw material consumed is more than BOM?',
        a: 'You can adjust the consumed quantity on the Work Order screen before closing the job. The extra material will be deducted and reflected in final unit cost.'
      }
    ],
    tips: [
      'Maintain accurate BOM formulas to ensure product margins are correctly calculated.'
    ]
  },

  {
    id: 'settings_masters',
    title: 'Masters, Roles & Settings',
    category: 'Administration',
    icon: 'Settings',
    badge: 'System Admin',
    color: 'from-gray-700 to-slate-900',
    accentColor: 'text-gray-700 dark:text-gray-300',
    bgLight: 'bg-gray-50 dark:bg-gray-900/40',
    borderColor: 'border-gray-300 dark:border-gray-800',
    summary: 'Multi-company group setup, legal entities, branch warehouses, role-based access control (RBAC), discount matrix, tax slabs, and system audit logs.',
    liveRoute: '/settings/company',
    submodules: [
      {
        id: 'company_branches',
        name: 'Group Setup, Companies & Branches',
        path: '/settings/company',
        purpose: 'Configure holding group, subsidiary legal companies, and multi-location branch warehouses.',
        keyFeatures: [
          'Multi-entity support with distinct tax registrations (GSTIN/TRN).',
          'Branch-level stock isolation and cross-branch transfer permissions.'
        ]
      },
      {
        id: 'roles_permissions',
        name: 'Roles & Permissions (RBAC)',
        path: '/settings/roles',
        purpose: 'Granular security permissions for staff (Cashier, Store Manager, Accountant, Admin).',
        keyFeatures: [
          'Screen-level access (View, Create, Edit, Delete).',
          'Action limits: Max discount allowed, cash drawer access, price override permissions.'
        ]
      },
      {
        id: 'audit_logs',
        name: 'System Audit Logs',
        path: '/settings/audit-logs',
        purpose: 'Immutable security log tracking every login, price change, order cancellation, and deletion.',
        keyFeatures: [
          'Logs user, IP address, exact timestamp, module, and before/after data values.'
        ]
      }
    ],
    workflows: [
      {
        title: 'Adding a New Staff Member with Restricted Cashier Access',
        time: '3 Minutes',
        difficulty: 'Easy',
        steps: [
          {
            stepNumber: 1,
            title: 'Configure Cashier Role',
            description: 'Go to Masters ➔ Roles & Permissions. Ensure Cashier role only has permissions for POS View, POS Create, and max 5% discount.',
            tip: 'Disable access to Accounts, Reports, and Inventory Adjustments.'
          },
          {
            stepNumber: 2,
            title: 'Create User Account',
            description: 'Go to Settings ➔ Users ➔ "Add User". Enter name, email, password, assign Cashier role, and link to their specific branch.',
            tip: 'Branch linking ensures cashiers only see stock and orders for their physical store.'
          }
        ]
      }
    ],
    faqs: [
      {
        q: 'Can an administrator restrict a user to only 1 branch?',
        a: 'Yes. In User Management, assign specific branch(es) to the user. They will only be able to view stock, create bills, and manage orders for their assigned branch.'
      }
    ],
    tips: [
      'Regularly review Audit Logs to detect unauthorized price edits or suspicious cancellations.'
    ]
  }
];
