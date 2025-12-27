// FILE: src/middleware/rbac.js
const db = require('../config/db');

const rbac = {
    canModifyPeriod: async (req, res, next) => {
        // Prioritize explicit period_id (body/query) over params.id (which might be expense/bank id)
        const periodId = req.body.period_id || req.query.period_id || req.params.id;
        console.log(`[RBAC] Checking modify permission. Path: ${req.path}, Body period_id: ${req.body.period_id}, Params id: ${req.params.id}, Resolved periodId: ${periodId}`);

        if (!periodId) {
            console.log('[RBAC] No period ID found');
            return res.status(400).json({ error: 'Period ID required' });
        }

        const [periods] = await db.query('SELECT status FROM periods WHERE id = ?', [periodId]);
        if (periods.length === 0) {
            return res.status(404).json({ error: 'Period not found' });
        }

        const period = periods[0];
        if (period.status === 'LOCKED') {
            return res.status(403).json({
                error: 'Period is LOCKED. Only SUPER_ADMIN can UNLOCK first.'
            });
        }

        next();
    },

    checkPeriodLock: async (periodId) => {
        const [periods] = await db.query('SELECT status FROM periods WHERE id = ?', [periodId]);
        if (periods.length === 0) return { locked: false, exists: false };
        return { locked: periods[0].status === 'LOCKED', exists: true };
    }
};

module.exports = rbac;
