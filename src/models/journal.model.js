// FILE: src/models/journal.model.js
const db = require('../config/db');

const Journal = {
  createAutoGL: async (periodId, userId) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Cleanup old Auto GL for this period
      await conn.query('DELETE FROM journal_entries WHERE period_id = ? AND entry_type = "AUTO_GL"', [periodId]);

      // 2. Fetch Period Info
      const [periods] = await conn.query('SELECT * FROM periods WHERE id = ?', [periodId]);
      const period = periods[0];
      if (!period) throw new Error('Period not found');

      // 3. Fetch Cashflow Transactions
      const [transactions] = await conn.query(`
                SELECT t.*, 
                       b1.bank_name as from_bank_name, b1.account_name as from_account_name,
                       b2.bank_name as to_bank_name, b2.account_name as to_account_name
                FROM cashflow_transactions t
                LEFT JOIN bank_accounts b1 ON t.bank_account_id = b1.id
                LEFT JOIN bank_accounts b2 ON t.to_bank_account_id = b2.id
                WHERE t.period_id = ?
            `, [periodId]);

      if (transactions.length === 0) {
        await conn.commit();
        return;
      }

      // 4. Create Journal Header
      const [res] = await conn.query(`
                INSERT INTO journal_entries(period_id, entry_date, entry_type, description, created_by)
                VALUES (?, ?, 'AUTO_GL', ?, ?)
            `, [periodId, period.period_date, `Auto GL for Period ${period.period_date.toISOString().split('T')[0]}`, userId]);

      const journalId = res.insertId;

      // Helper to Insert Line
      const addLine = async (code, name, dr, cr) => {
        if (dr === 0 && cr === 0) return;
        await conn.query(`
                    INSERT INTO journal_lines (journal_entry_id, account_code, account_name, debit_lak, credit_lak)
                    VALUES (?, ?, ?, ?, ?)
                `, [journalId, code, name, dr, cr]);
      };

      // 5. Process Transactions
      for (const t of transactions) {
        const amount = Number(t.amount);

        // Bank Account Info Helpers
        const fromBankName = t.from_bank_name ? `${t.from_bank_name} (${t.from_account_name})` : 'Unknown Bank';
        const fromBankCode = t.bank_account_id ? `1100-${t.bank_account_id}` : '1100-UNKNOWN';

        const toBankName = t.to_bank_name ? `${t.to_bank_name} (${t.to_account_name})` : 'Unknown Bank';
        const toBankCode = t.to_bank_account_id ? `1100-${t.to_bank_account_id}` : '1100-UNKNOWN';

        if (t.type === 'TRANSFER') {
          // Dr Bank (To) / Cr Bank (From)
          await addLine(toBankCode, toBankName, amount, 0);
          await addLine(fromBankCode, fromBankName, 0, amount);
        } else if (t.type === 'INFLOW') {
          // Dr Bank (From/Receiving Account - Inflow usually has 'bank_account_id' as the receiver)
          // Note: Schema says 'bank_account_id' is From/Main. For Inflow, it's where money goes IN.
          await addLine(fromBankCode, fromBankName, amount, 0);

          // Cr Source (Revenue/Equity) based on Category
          switch (t.category) {
            case 'SALES_IN':
              await addLine('4100', 'Revenue from Sales', 0, amount);
              break;
            case 'TOP_UP_IN':
              await addLine('3100', 'Capital - Top Up', 0, amount);
              break;
            case 'SETTLEMENT_CLEAR':
              await addLine('3200', 'Settlement Clearing', 0, amount);
              break;
            default:
              await addLine('4900', `Other Income (${t.category})`, 0, amount);
          }
        } else if (t.type === 'OUTFLOW') {
          // Cr Bank (From/Paying Account)
          await addLine(fromBankCode, fromBankName, 0, amount);

          // Dr Expense/Liability
          switch (t.category) {
            case 'PRIZE_PAYOUT':
              await addLine('5100', 'Prize Payout', amount, 0);
              break;
            case 'OPEX':
              await addLine('5200', 'Operating Expense', amount, 0);
              break;
            case 'TAX_PAY':
              await addLine('5300', 'Tax Expense', amount, 0);
              break;
            case 'BROKER_PAY':
              await addLine('5400', 'Broker Commission', amount, 0);
              break;
            case 'DIVIDEND_PAY':
              await addLine('3300', 'Retained Earnings - Dividend', amount, 0);
              break;
            default:
              await addLine('5900', `Other Expense (${t.category})`, amount, 0);
          }
        }
      }

      await conn.commit();
      return journalId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  findByPeriod: async (periodId) => {
    const [entries] = await db.query(`
      SELECT * FROM journal_entries WHERE period_id = ? ORDER BY entry_date DESC
    `, [periodId]);

    for (let entry of entries) {
      const [lines] = await db.query(`
        SELECT * FROM journal_lines WHERE journal_entry_id = ? ORDER BY id
      `, [entry.id]);
      entry.lines = lines;
    }

    return entries;
  }
};

module.exports = Journal;
