// FILE: src/utils/timeRule.js
const timeRule = {
    DRAW_TIME: '20:00:00',

    // คำนวณ accounting_period_id จาก occurred_at
    calculateAccountingPeriod: async (occurredAt, db) => {
        // occurred_at = เวลาที่ค่าใช้จ่ายเกิดขึ้นจริง
        // ค้นหางวดที่ (Closing Time >= Expense Time)
        // เรียงตามวันที่น้อยไปมาก (หา Deadline ที่ใกล้ที่สุดที่ยังมาไม่ถึง หรือเพิ่งผ่านไป)

        const [periods] = await db.query(`
      SELECT id, period_date
      FROM periods
      WHERE TIMESTAMP(period_date, '20:00:00') >= ?
      ORDER BY period_date ASC
      LIMIT 1
    `, [occurredAt]);

        if (periods.length === 0) {
            // ถ้าไม่เจองวดในอนาคตเลย (แปลว่าเป็นรายการที่เกิดขึ้นหลังงวดสุดท้ายที่มีในระบบ)
            // ให้ Map เข้ากับงวดล่าสุด
            const [lastPeriod] = await db.query(`
        SELECT id FROM periods ORDER BY period_date DESC LIMIT 1
      `);
            return lastPeriod.length > 0 ? lastPeriod[0].id : null;
        }

        return periods[0].id;
    },

    formatDateTime: (date) => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    },

    parseDateTime: (dateString) => {
        // Expects format: YYYY-MM-DD HH:mm
        return new Date(dateString);
    }
};

module.exports = timeRule;
