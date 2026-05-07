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

            res.render('reports/period', {
                period,
                summary: summary || {},
                expenses,
                banks,
                expenseTotal,
                bankTotal,
                money
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

            for (const period of periods) {
                // Use aggregated data directly from Period model to ensure consistency
                const grossSales = parseFloat(period.gross_sales) || 0;
                const totalPrizes = parseFloat(period.total_prizes) || 0;
                const totalExpenses = parseFloat(period.total_expenses) || 0;

                totalSalesLak += grossSales;
                totalPrizesLak += totalPrizes;
                totalExpensesLak += totalExpenses;

                // Fetch secondary data for THB if needed (as currently not aggregated in Period model)
                const summary = await Summary.findByPeriod(period.id);
                const expenseTotal = await Expense.getTotalByPeriod(period.id);

                if (summary) {
                    totalSalesThb += parseFloat(summary.sales_thb || 0);
                }

                totalExpensesThb += parseFloat(expenseTotal.total_thb || 0);
            }

            const totals = {
                salesLak: totalSalesLak,
                salesThb: totalSalesThb,
                prizesLak: totalPrizesLak, // Add to totals
                expensesLak: totalExpensesLak,
                expensesThb: totalExpensesThb,
                // Net Profit = Sales - Prizes - Expenses
                netLak: totalSalesLak - totalPrizesLak - totalExpensesLak,
                netThb: totalSalesThb - totalExpensesThb
            };

            res.render('reports/monthly', { periods, year, month, totals, money });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error generating monthly report');
        }
    }
};

module.exports = reportController;
