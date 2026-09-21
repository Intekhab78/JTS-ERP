const mongoose = require('mongoose');
const JournalEntry = require('../core/models/JournalEntry');
const JournalEntryLine = require('../core/models/JournalEntryLine');
const AccountMapping = require('../core/models/AccountMapping');
const Account = require('../core/models/Account');

class AccountingService {
  
  /**
   * Safe financial rounding to 2 decimal places
   */
  static round(num) {
    return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
  }

  /**
   * Validate a set of lines against accounting rules
   */
  static async validateLines(lines, tenantId) {
    if (!lines || lines.length < 2) {
      throw new Error('Journal Entry must have at least two lines.');
    }

    let totalDebit = 0;
    let totalCredit = 0;
    let hasDebit = false;
    let hasCredit = false;

    for (const line of lines) {
      if (!line.accountId) throw new Error('Account is required for all lines.');
      
      const debit = this.round(line.debit || 0);
      const credit = this.round(line.credit || 0);

      if (debit < 0 || credit < 0) throw new Error('Negative debit or credit is not allowed.');
      if (debit > 0 && credit > 0) throw new Error('A line cannot contain both debit and credit.');
      if (debit === 0 && credit === 0) throw new Error('A line cannot have zero for both debit and credit.');

      // Check account exists, active and belongs to tenant
      const account = await Account.findOne({ _id: line.accountId, tenantId });
      if (!account) throw new Error(`Account ${line.accountId} not found or does not belong to the tenant.`);
      if (!account.isActive) throw new Error(`Account ${account.code} - ${account.name} is inactive.`);

      if (debit > 0) {
        totalDebit = this.round(totalDebit + debit);
        hasDebit = true;
      }
      if (credit > 0) {
        totalCredit = this.round(totalCredit + credit);
        hasCredit = true;
      }
    }

    if (!hasDebit) throw new Error('Journal Entry must contain at least one debit line.');
    if (!hasCredit) throw new Error('Journal Entry must contain at least one credit line.');
    
    if (totalDebit !== totalCredit) {
      throw new Error(`Total Debit (${totalDebit}) does not equal Total Credit (${totalCredit}).`);
    }

    return { totalAmount: totalDebit };
  }

  /**
   * Check for duplicate POSTED entries
   */
  static async checkDuplicateSourceEntry(sourceId, sourceModel, tenantId, session = null) {
    if (!sourceId || !sourceModel) return;
    const existing = await JournalEntry.findOne({
      tenantId,
      sourceId,
      sourceModel,
      status: 'POSTED'
    }).session(session);

    if (existing) {
      throw new Error(`A POSTED journal entry already exists for this ${sourceModel}.`);
    }
  }

  /**
   * Create a new Journal Entry
   */
  static async createJournalEntry(data, tenantId, createdBy) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { description, reference, date, lines, sourceId, sourceModel } = data;
      
      if (sourceId && sourceModel) {
        await this.checkDuplicateSourceEntry(sourceId, sourceModel, tenantId, session);
      }

      const { totalAmount } = await this.validateLines(lines, tenantId);

      const entry = await JournalEntry.create([{
        tenantId,
        entryDate: date || new Date(),
        description,
        reference,
        sourceId,
        sourceModel,
        totalAmount,
        status: 'DRAFT', // Always create as DRAFT first, or let post handle it
        createdBy
      }], { session });

      const entryId = entry[0]._id;

      const linesToCreate = lines.map(line => ({
        tenantId,
        journalEntryId: entryId,
        accountId: line.accountId,
        debit: this.round(line.debit || 0),
        credit: this.round(line.credit || 0),
        description: line.description || ''
      }));

      await JournalEntryLine.insertMany(linesToCreate, { session });

      await session.commitTransaction();
      session.endSession();
      return entry[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Update DRAFT Journal Entry
   */
  static async updateJournalEntry(id, data, tenantId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const entry = await JournalEntry.findOne({ _id: id, tenantId }).session(session);
      if (!entry) throw new Error('Journal Entry not found.');
      if (entry.status !== 'DRAFT') throw new Error(`Cannot edit a ${entry.status} Journal Entry.`);

      const { description, reference, date, lines } = data;

      const { totalAmount } = await this.validateLines(lines, tenantId);

      entry.description = description || entry.description;
      entry.reference = reference !== undefined ? reference : entry.reference;
      entry.entryDate = date || entry.entryDate;
      entry.totalAmount = totalAmount;
      await entry.save({ session });

      // Replace all lines
      await JournalEntryLine.deleteMany({ journalEntryId: id, tenantId }, { session });

      const linesToCreate = lines.map(line => ({
        tenantId,
        journalEntryId: id,
        accountId: line.accountId,
        debit: this.round(line.debit || 0),
        credit: this.round(line.credit || 0),
        description: line.description || ''
      }));

      await JournalEntryLine.insertMany(linesToCreate, { session });

      await session.commitTransaction();
      session.endSession();
      return entry;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Post a Journal Entry
   */
  static async postJournalEntry(id, tenantId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const entry = await JournalEntry.findOne({ _id: id, tenantId }).session(session);
      if (!entry) throw new Error('Journal Entry not found.');
      if (entry.status === 'POSTED') throw new Error('Journal Entry is already POSTED.');
      if (entry.status === 'VOIDED') throw new Error('Cannot post a VOIDED Journal Entry.');

      if (entry.sourceId && entry.sourceModel) {
        await this.checkDuplicateSourceEntry(entry.sourceId, entry.sourceModel, tenantId, session);
      }

      const lines = await JournalEntryLine.find({ journalEntryId: id, tenantId }).session(session);
      await this.validateLines(lines, tenantId);

      entry.status = 'POSTED';
      await entry.save({ session });

      await session.commitTransaction();
      session.endSession();
      return entry;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Void a POSTED Journal Entry
   */
  static async voidJournalEntry(id, tenantId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const entry = await JournalEntry.findOne({ _id: id, tenantId }).session(session);
      if (!entry) throw new Error('Journal Entry not found.');
      if (entry.status === 'VOIDED') throw new Error('Journal Entry is already VOIDED.');

      entry.status = 'VOIDED';
      await entry.save({ session });

      await session.commitTransaction();
      session.endSession();
      return entry;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Reverse a POSTED Journal Entry
   */
  static async reverseJournalEntry(id, tenantId, createdBy) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const entry = await JournalEntry.findOne({ _id: id, tenantId }).session(session);
      if (!entry) throw new Error('Journal Entry not found.');
      if (entry.status !== 'POSTED') throw new Error('Only POSTED entries can be reversed.');

      // Check if already reversed
      const existingReversal = await JournalEntry.findOne({ reversalOf: id, tenantId }).session(session);
      if (existingReversal) throw new Error('This Journal Entry has already been reversed.');

      const lines = await JournalEntryLine.find({ journalEntryId: id, tenantId }).session(session);

      const reversalEntry = await JournalEntry.create([{
        tenantId,
        entryDate: new Date(),
        description: `Reversal of JE-${entry._id.toString().slice(-6).toUpperCase()} : ${entry.description}`,
        reference: entry.reference,
        sourceId: entry.sourceId,
        sourceModel: entry.sourceModel,
        reversalOf: entry._id,
        totalAmount: entry.totalAmount,
        status: 'POSTED',
        createdBy
      }], { session });

      const reversalId = reversalEntry[0]._id;

      const linesToCreate = lines.map(line => ({
        tenantId,
        journalEntryId: reversalId,
        accountId: line.accountId,
        debit: line.credit, // SWAP
        credit: line.debit, // SWAP
        description: line.description
      }));

      await JournalEntryLine.insertMany(linesToCreate, { session });

      await session.commitTransaction();
      session.endSession();
      return reversalEntry[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Get mapped account ID by key
   */
  static async getAccountMapping(key, tenantId) {
    const mapping = await AccountMapping.findOne({ tenantId, key, isActive: true }).populate('accountId');
    if (!mapping || !mapping.accountId) {
      throw new Error(`Account mapping for ${key} is missing or inactive. Please configure it in Account Mappings.`);
    }
    if (!mapping.accountId.isActive) {
      throw new Error(`Mapped account ${mapping.accountId.code} for ${key} is inactive.`);
    }
    return mapping.accountId._id;
  }
}

module.exports = AccountingService;
