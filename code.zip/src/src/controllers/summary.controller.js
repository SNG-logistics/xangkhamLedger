// FILE: src/controllers/summary.controller.js
const Summary = require('../models/summary.model');
const audit = require('../middleware/audit');
const fs = require('fs');
const path = require('path');

const summaryController = {
    index: async (req, res) => {
        try {
            const periods = await require('../models/period.model').findAll();
            res.render('summaries/index', { periods, money: require('../utils/money') });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading summaries');
        }
    },

    showForm: async (req, res) => {
        try {
            const periodId = req.params.periodId;
            const summary = await Summary.findByPeriod(periodId);
            res.render('summaries/form', { periodId, summary: summary || {} });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading form');
        }
    },

    save: async (req, res) => {
        try {
            const { period_id, notes } = req.body;

            // Extract breakdown inputs (default to 0 if empty)
            const sales_6_digit = parseFloat(req.body.sales_6_digit) || 0;
            const prize_6_digit = parseFloat(req.body.prize_6_digit) || 0;
            const sales_5_digit = parseFloat(req.body.sales_5_digit) || 0;
            const prize_5_digit = parseFloat(req.body.prize_5_digit) || 0;
            const sales_4_digit = parseFloat(req.body.sales_4_digit) || 0;
            const prize_4_digit = parseFloat(req.body.prize_4_digit) || 0;
            const sales_3_digit = parseFloat(req.body.sales_3_digit) || 0;
            const prize_3_digit = parseFloat(req.body.prize_3_digit) || 0;
            const sales_2_digit = parseFloat(req.body.sales_2_digit) || 0;
            const prize_2_digit = parseFloat(req.body.prize_2_digit) || 0;
            const sales_1_digit = parseFloat(req.body.sales_1_digit) || 0;
            const prize_1_digit = parseFloat(req.body.prize_1_digit) || 0;

            // Auto-calculate Total Sales LAK (Net Sales = Sales - Prizes)
            const total_sales = sales_6_digit + sales_5_digit + sales_4_digit + sales_3_digit + sales_2_digit + sales_1_digit;
            const total_prizes = prize_6_digit + prize_5_digit + prize_4_digit + prize_3_digit + prize_2_digit + prize_1_digit;

            const total_sales_lak = total_sales - total_prizes;

            const salesData = {
                sales_6_digit, prize_6_digit,
                sales_5_digit, prize_5_digit,
                sales_4_digit, prize_4_digit,
                sales_3_digit, prize_3_digit,
                sales_2_digit, prize_2_digit,
                sales_1_digit, prize_1_digit,
                total_sales_lak
            };

            const files = req.files;

            let filePaths = [];
            if (files && files.attachments) {
                const attachments = Array.isArray(files.attachments) ? files.attachments : [files.attachments];

                for (const file of attachments) {
                    const filename = Date.now() + '-' + file.name;
                    const uploadPath = path.join(__dirname, '../public/uploads', filename);
                    await file.mv(uploadPath);
                    filePaths.push(filename);
                }
            }

            await Summary.upsert(
                period_id,
                salesData,
                0, // sales_thb is unused for Sales
                filePaths,
                notes,
                req.session.userId
            );

            await audit.log(
                req.session.userId,
                'SAVE_SUMMARY',
                'sales_summaries',
                period_id,
                null,
                { sales_lak: total_sales_lak, sales_thb: 0 },
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.redirect('/periods/' + period_id);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error saving summary');
        }
    }
};

module.exports = summaryController;
