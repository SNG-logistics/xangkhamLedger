// Money input formatter
function formatMoneyInput(input) {
    let value = input.value.replace(/,/g, '');
    if (value && !isNaN(value)) {
        input.value = parseFloat(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

// Auto-format money inputs on blur AND Sidebar Logic
document.addEventListener('DOMContentLoaded', function () {
    // ---- Sidebar Toggle Logic ----
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');

    // Check saved state
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed && sidebar && mainContent) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }

    if (toggleBtn && sidebar && mainContent) {
        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent immediate closing when clicking toggle

            // Desktop behavior
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');

            // Mobile behavior
            sidebar.classList.toggle('mobile-active');

            // Save state (only for desktop preference)
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function (e) {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains('mobile-active')) {
                    sidebar.classList.remove('mobile-active');
                    sidebar.classList.remove('collapsed'); // Reset to default if needed
                }
            }
        });
    }
    // -----------------------------

    const moneyInputs = document.querySelectorAll('input[data-money]');
    moneyInputs.forEach(input => {
        input.addEventListener('blur', function () {
            formatMoneyInput(this);
        });

        input.addEventListener('focus', function () {
            this.value = this.value.replace(/,/g, '');
        });
    });

    // Clean money inputs before submit
    document.addEventListener('submit', function (e) {
        const form = e.target;
        const moneyInputs = form.querySelectorAll('input[data-money]');
        moneyInputs.forEach(input => {
            input.value = input.value.replace(/,/g, '');
        });
    });
});

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Lock/Unlock Period
function lockPeriod(periodId) {
    const reason = prompt('กรุณาระบุเหตุผลในการ LOCK งวดนี้:');
    if (!reason || reason.trim() === '') {
        alert('ต้องระบุเหตุผล!');
        return;
    }

    fetch(`/periods/${periodId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('LOCK งวดสำเร็จ!');
                location.reload();
            } else {
                alert('Error: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(err => {
            alert('Error: ' + err.message);
        });
}

function unlockPeriod(periodId) {
    const reason = prompt('กรุณาระบุเหตุผลในการ UNLOCK งวดนี้:');
    if (!reason || reason.trim() === '') {
        alert('ต้องระบุเหตุผล!');
        return;
    }

    fetch(`/periods/${periodId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('UNLOCK งวดสำเร็จ!');
                location.reload();
            } else {
                alert('Error: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(err => {
            alert('Error: ' + err.message);
        });
}

// Delete with confirmation
function deleteExpense(id, periodId) {
    if (!confirm('ต้องการลบรายการนี้หรือไม่?')) return;

    fetch(`/expenses/${id}?period_id=${periodId}`, {
        method: 'DELETE'
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('ลบสำเร็จ!');
                location.href = '/periods/' + periodId;
            } else {
                alert('Error: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(err => {
            alert('Error: ' + err.message);
        });
}

function deleteBank(id, periodId) {
    if (!confirm('ต้องการลบรายการนี้หรือไม่?')) return;

    fetch(`/banks/${id}?period_id=${periodId}`, {
        method: 'DELETE'
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('ลบสำเร็จ!');
                location.href = '/periods/' + periodId;
            } else {
                alert('Error: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(err => {
            alert('Error: ' + err.message);
        });
}

function deletePeriod(id) {
    if (!confirm('ยืนยันลบงวดนี้?\n⚠️ คำเตือน: ข้อมูลทั้งหมดในงวด (รายรับ/รายจ่าย/ยอดธนาคาร) จะถูกลบถาวร!')) return;

    fetch(`/periods/${id}`, {
        method: 'DELETE'
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('ลบงวดสำเร็จ!');
                location.reload();
            } else {
                alert('Error: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(err => {
            alert('Error: ' + err.message);
        });
}

// Real-time total calculation
function calculateTotal() {
    const lakInputs = document.querySelectorAll('[data-sum-lak]');
    const thbInputs = document.querySelectorAll('[data-sum-thb]');

    let lakTotal = 0;
    let thbTotal = 0;

    lakInputs.forEach(input => {
        const val = parseFloat(input.value.replace(/,/g, '')) || 0;
        lakTotal += val;
    });

    thbInputs.forEach(input => {
        const val = parseFloat(input.value.replace(/,/g, '')) || 0;
        thbTotal += val;
    });

    const lakDisplay = document.getElementById('total-lak');
    const thbDisplay = document.getElementById('total-thb');

    if (lakDisplay) {
        lakDisplay.textContent = lakTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    if (thbDisplay) {
        thbDisplay.textContent = thbTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}