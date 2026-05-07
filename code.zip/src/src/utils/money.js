// FILE: src/utils/money.js
const money = {
    format: (amount) => {
        if (!amount || isNaN(amount)) return '0.00';
        return parseFloat(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    parse: (formattedAmount) => {
        if (!formattedAmount) return 0;
        const cleaned = formattedAmount.toString().replace(/,/g, '');
        return parseFloat(cleaned) || 0;
    },

    add: (...amounts) => {
        return amounts.reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
    },

    subtract: (a, b) => {
        return (parseFloat(a) || 0) - (parseFloat(b) || 0);
    }
};

module.exports = money;
