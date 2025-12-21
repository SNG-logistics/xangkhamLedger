// FILE: src/public/js/ui.js

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

// Auto-format money inputs on blur
document.addEventListener('DOMContentLoaded', function () {
    const moneyInputs = document.querySelectorAll('input[data-money]');
    moneyInputs.forEach(input => {
        input.addEventListener('blur', function () {
            formatMoneyInput(this);
        });

        input.addEventListener('focus', function () {
            this.value = this.value.replace(/,/g, '');
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

    fetch(`/expenses/${id}`, {
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

    fetch(`/banks/${id}`, {
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
