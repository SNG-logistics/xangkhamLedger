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
            const Period = require('../models/period.model');
            const BankBalance = require('../models/bank_balance.model');

            // Auto-fetch previous balance
            let previousBalance = 0;
            let previousPeriodDate = null;
            if (!summary || !summary.opening_balance) {
                const previousPeriod = await Period.getPreviousPeriod(periodId);
                if (previousPeriod) {
                    const prevBalances = await BankBalance.getByPeriod(previousPeriod.id);
                    previousBalance = prevBalances.reduce((sum, b) => sum + (parseFloat(b.balance_lak) || 0), 0);
                    previousPeriodDate = previousPeriod.period_date;
                }
            }

            res.render('summaries/form', {
                periodId,
                summary: summary || {},
                suggestedOpeningBalance: previousBalance,
                previousPeriodDate
            });
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

            // Extract Profit from Throwing & Capital Columns
            const profit_throwing = parseFloat(req.body.profit_loss_throwing) || 0;
            const capital_injection = parseFloat(req.body.capital_injection) || 0;
            const capital_return = parseFloat(req.body.capital_return) || 0;
            const opening_balance = parseFloat(req.body.opening_balance) || 0;

            // New Cash-in Fields
            const pre_draw_amount = parseFloat(req.body.pre_draw_cash_in_amount) || 0;
            const post_draw_amount = parseFloat(req.body.post_draw_cash_in_amount) || 0;
            const pre_draw_note = req.body.pre_draw_note || null;
            const post_draw_note = req.body.post_draw_note || null;
            const cutoff_time = req.body.cutoff_time || '20:10:00';

            const summaryId = await Summary.upsert(
                period_id,
                salesData,
                0, // sales_thb is unused for Sales
                filePaths,
                notes,
                req.session.userId,
                profit_throwing,
                capital_injection,
                capital_return,
                opening_balance,
                pre_draw_amount,
                post_draw_amount,
                pre_draw_note,
                post_draw_note,
                cutoff_time
            );

            // Handle Settlement Evidence
            if (files) {
                // Helper to save evidence
                const saveEvidence = async (fileKey, bucket) => {
                    if (files[fileKey]) {
                        const evidences = Array.isArray(files[fileKey]) ? files[fileKey] : [files[fileKey]];
                        for (const file of evidences) {
                            const filename = 'evidence-' + bucket + '-' + Date.now() + '-' + file.name;
                            const uploadPath = path.join(__dirname, '../public/uploads', filename);
                            await file.mv(uploadPath);
                            await Summary.addSettlementEvidence(summaryId, bucket, filename);
                        }
                    }
                };

                await saveEvidence('pre_draw_evidence', 'PRE_DRAW');
                await saveEvidence('post_draw_evidence', 'POST_DRAW');
            }

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
