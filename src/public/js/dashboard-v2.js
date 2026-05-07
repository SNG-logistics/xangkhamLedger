document.addEventListener('DOMContentLoaded', () => {
    // --- Socket.io Setup ---
    const socket = io();

    socket.on('connect', () => {
        console.log('Connected to server via Socket.io');
    });

    socket.on('dashboard:update', (data) => {
        console.log('Received dashboard update:', data);
        updateDashboardStats(data);
        if (window.salesChart) {
            updateSalesChart(data.history);
        }
    });

    // --- Chart.js Setup ---
    const ctx = document.getElementById('salesTrendChart');
    if (ctx) {
        // Initial data format handling
        // We expect `dashboardHistory` to be injected into the page via EJS script tag
        // or fetched via API. For now, let's assume it's passed globally.

        const initialData = window.dashboardHistory || [];

        window.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: initialData.map(d => d.period_date),
                datasets: [{
                    label: 'Net Profit (LAK)',
                    data: initialData.map(d => d.net_profit),
                    borderColor: '#4f46e5', // Indigo-600
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('th-TH').format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // --- Helper Functions ---
    function updateDashboardStats(data) {
        if (!data) return;

        // Animate counting numbers
        if (data.totalPeriods !== undefined) animateValue("stats-total-periods", data.totalPeriods);
        if (data.openPeriods !== undefined) animateValue("stats-open-periods", data.openPeriods);
        if (data.lockedPeriods !== undefined) animateValue("stats-locked-periods", data.lockedPeriods);

        // Update other real-time elements if provided in data
        // e.g. recent transactions ticker
    }

    function animateValue(id, end) {
        const obj = document.getElementById(id);
        if (!obj) return;

        // Simple swap for now (expand to counting animation if desired)
        obj.innerText = end;
    }

    function updateSalesChart(historyData) {
        if (!historyData || !window.salesChart) return;

        window.salesChart.data.labels = historyData.map(d => d.period_date);
        window.salesChart.data.datasets[0].data = historyData.map(d => d.net_profit);
        window.salesChart.update();
    }
});
