// FILE: src/controllers/report.controller.js
const Period = require('../models/period.model');
const Summary = require('../models/summary.model');
const Expense = require('../models/expense.model');
const Bank = require('../models/bank.model');
const money = require('../utils/money');

const reportController = {
    periodReport: async (req, res) => {
        try {
            const periodId = req.params.periodId;
            const period = await Period.findById(periodId);
            const summary = await Summary.findByPeriod(periodId);
            const expenses = await Expense.findByPeriod(periodId);
            const banks = await Bank.findByPeriod(periodId);

            const expenseTotal = await Expense.getTotalByPeriod(periodId);
            const bankTotal = await Bank.getTotalByPeriod(periodId);

            // Calculate Expense Summary by Category
            const expenseSummary = {
                '1. จ่ายทั่วไป': 0,
                '2.1 โปรโมชั่นใช้เครดิต': 0,
                '2.2 โปรโมชั่นเงินสด': 0,
                '3. กิจกรรม/การตลาด': 0,
                '4. ธนาคาร': 0,
                '5. ภาษีอากร': 0,
                '6. โยนของ': 0,
                // Legacy support
                '2. โปรโมชันเงินสด': 0,
                '3. โปรโมชันใช้เครดิต': 0,
                '2. โปร': 0
            };

            expenses.forEach(exp => {
                if (expenseSummary[exp.category] !== undefined) {
                    expenseSummary[exp.category] += parseFloat(exp.amount_lak) || 0;
                } else {
                    // Fallback for unrecognized categories
                    expenseSummary['1. จ่ายทั่วไป'] += parseFloat(exp.amount_lak) || 0;
                }
            });

            // Calculate parent category "2. รวมโปรโมชั่น"
            expenseSummary['2. รวมโปรโมชั่น'] =
                expenseSummary['2.1 โปรโมชั่นใช้เครดิต'] +
                expenseSummary['2.2 โปรโมชั่นเงินสด'] +
                expenseSummary['2. โปรโมชันเงินสด'] +  // Legacy
                expenseSummary['3. โปรโมชันใช้เครดิต'] + // Legacy
                expenseSummary['2. โปร'];  // Legacy

            let evidences = [];
            if (summary) {
                evidences = await Summary.getSettlementEvidence(summary.id);
            }

            res.render('reports/period', {
                period,
                summary: summary || {},
                evidences,
                expenses,
                banks,
                expenseTotal,
                bankTotal,
                expenseSummary,
                money,
                layout: false
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error generating period report');
        }
    },

    monthlyReport: async (req, res) => {
        try {
            const { year, month } = req.query;

            if (!year || !month) {
                return res.render('reports/monthly', { periods: [], year: null, month: null, totals: {}, money });
            }

            const periods = await Period.findByYearMonth(parseInt(year), parseInt(month));

            let totalSalesLak = 0, totalSalesThb = 0;
            let totalPrizesLak = 0; // Add prizes tracking
            let totalExpensesLak = 0, totalExpensesThb = 0;
            let totalProfitThrowing = 0; // Add profit throwing tracking

            // Calculate Expense Summary by Category
            const expenseSummary = {
                '1. จ่ายทั่วไป': 0,
                '2.1 โปรโมชั่นใช้เครดิต': 0,
                '2.2 โปรโมชั่นเงินสด': 0,
                '3. กิจกรรม/การตลาด': 0,
                '4. ธนาคาร': 0,
                '5. ภาษีอากร': 0,
                '6. โยนของ': 0,
                // Legacy support
                '2. โปรโมชันเงินสด': 0,
                '3. โปรโมชันใช้เครดิต': 0,
                '2. โปร': 0
            };

            for (const period of periods) {
                // Use aggregated data directly from Period model to ensure consistency
                const grossSales = parseFloat(period.gross_sales) || 0;
                const totalPrizes = parseFloat(period.total_prizes) || 0;
                const totalExpenses = parseFloat(period.total_expenses) || 0;
                const profitThrowing = parseFloat(period.profit_throwing) || 0;

                totalSalesLak += grossSales;
                totalPrizesLak += totalPrizes;
                totalExpensesLak += totalExpenses;
                totalProfitThrowing += profitThrowing;

                // Fetch secondary data for THB if needed (as currently not aggregated in Period model)
                const summary = await Summary.findByPeriod(period.id);
                const expenseTotal = await Expense.getTotalByPeriod(period.id);

                // Fetch expenses for category summary
                const expenses = await Expense.findByPeriod(period.id);
                expenses.forEach(exp => {
                    if (expenseSummary[exp.category] !== undefined) {
                        expenseSummary[exp.category] += parseFloat(exp.amount_lak) || 0;
                    } else {
                        // Fallback
                        expenseSummary['1. จ่ายทั่วไป'] += parseFloat(exp.amount_lak) || 0;
                    }
                });

                if (summary) {
                    totalSalesThb += parseFloat(summary.sales_thb || 0);
                }

                totalExpensesThb += parseFloat(expenseTotal.total_thb || 0);
            }

            // Calculate parent category "2. รวมโปรโมชั่น"
            expenseSummary['2. รวมโปรโมชั่น'] =
                expenseSummary['2.1 โปรโมชั่นใช้เครดิต'] +
                expenseSummary['2.2 โปรโมชั่นเงินสด'] +
                expenseSummary['2. โปรโมชันเงินสด'] +  // Legacy
                expenseSummary['3. โปรโมชันใช้เครดิต'] + // Legacy
                expenseSummary['2. โปร'];  // Legacy

            const totals = {
                salesLak: totalSalesLak,
                salesThb: totalSalesThb,
                prizesLak: totalPrizesLak, // Add to totals
                expensesLak: totalExpensesLak,
                expensesThb: totalExpensesThb,
                profitThrowing: totalProfitThrowing,
                // Net Profit = Sales - Prizes + Throwing - Expenses
                netLak: totalSalesLak - totalPrizesLak + totalProfitThrowing - totalExpensesLak,
                netThb: totalSalesThb - totalExpensesThb
            };

            // Calculate Profit Color and Sign
            const profitColor = totals.netLak >= 0 ? '#2e7d32' : '#c62828';
            const profitSign = totals.netLak >= 0 ? '+' : '';

            res.render('reports/monthly', {
                periods,
                year,
                month,
                totals,
                expenseSummary,
                money,
                profitColor,
                profitSign,
                layout: false
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error generating monthly report');
        }
    }
};

module.exports = reportController;
