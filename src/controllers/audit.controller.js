// FILE: src/controllers/audit.controller.js
const Audit = require('../models/audit.model');

const auditController = {
    logs: async (req, res) => {
        try {
            const action = req.query.action || null;
            const logs = action ? await Audit.findByAction(action) : await Audit.findAll();
            const lockEvents = await Audit.findLockEvents();

            res.render('audit/logs', { logs, lockEvents });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading audit logs');
        }
    },

    check: (req, res) => {
        res.render('audit/check', {
            title: 'Audit System - ตรวจสอบความถูกต้องสลาก'
        });
    }
};

module.exports = auditController;
