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

// Toast Helper
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

function showToast(icon, title) {
    Toast.fire({
        icon: icon,
        title: title
    });
}

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
    Swal.fire({
        title: 'ระบุเหตุผลในการ LOCK',
        input: 'text',
        inputLabel: 'เหตุผล',
        inputPlaceholder: 'ใส่เหตุผลที่นี่...',
        showCancelButton: true,
        confirmButtonText: 'Lock',
        cancelButtonText: 'Cancel',
        showLoaderOnConfirm: true,
        preConfirm: (reason) => {
            if (!reason) {
                Swal.showValidationMessage('กรุณาระบุเหตุผล');
            }
            return fetch(`/periods/${periodId}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason })
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(error => { throw new Error(error.error || response.statusText) });
                    }
                    return response.json();
                })
                .catch(error => {
                    Swal.showValidationMessage(`Request failed: ${error}`);
                });
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Locked!',
                text: 'งวดถูก LOCK เรียบร้อยแล้ว',
                icon: 'success'
            }).then(() => {
                location.reload();
            });
        }
    });
}

function unlockPeriod(periodId) {
    Swal.fire({
        title: 'ระบุเหตุผลในการ UNLOCK',
        input: 'text',
        inputLabel: 'เหตุผล',
        inputPlaceholder: 'ใส่เหตุผลที่นี่...',
        showCancelButton: true,
        confirmButtonText: 'Unlock',
        cancelButtonText: 'Cancel',
        showLoaderOnConfirm: true,
        preConfirm: (reason) => {
            if (!reason) {
                Swal.showValidationMessage('กรุณาระบุเหตุผล');
            }
            return fetch(`/periods/${periodId}/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason })
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(error => { throw new Error(error.error || response.statusText) });
                    }
                    return response.json();
                })
                .catch(error => {
                    Swal.showValidationMessage(`Request failed: ${error}`);
                });
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Unlocked!',
                text: 'งวดถูก UNLOCK เรียบร้อยแล้ว',
                icon: 'success'
            }).then(() => {
                location.reload();
            });
        }
    });
}

// Delete with confirmation
function deleteExpense(id, periodId) {
    Swal.fire({
        title: 'ต้องการลบรายการนี้หรือไม่?',
        text: "คุณไม่สามารถย้อนกลับการกระทำนี้ได้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/expenses/${id}?period_id=${periodId}`, {
                method: 'DELETE'
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire(
                            'ลบสำเร็จ!',
                            'รายการถูกลบแล้ว.',
                            'success'
                        ).then(() => {
                            location.href = '/periods/' + periodId;
                        });
                    } else {
                        Swal.fire(
                            'Error!',
                            data.error || 'เกิดข้อผิดพลาดในการลบ',
                            'error'
                        );
                    }
                })
                .catch(err => {
                    Swal.fire(
                        'Error!',
                        err.message,
                        'error'
                    );
                });
        }
    });
}

function deleteBank(id, periodId) {
    Swal.fire({
        title: 'ต้องการลบรายการนี้หรือไม่?',
        text: "คุณไม่สามารถย้อนกลับการกระทำนี้ได้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/banks/${id}?period_id=${periodId}`, {
                method: 'DELETE'
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire(
                            'ลบสำเร็จ!',
                            'รายการถูกลบแล้ว.',
                            'success'
                        ).then(() => {
                            location.href = '/periods/' + periodId;
                        });
                    } else {
                        Swal.fire(
                            'Error!',
                            data.error || 'เกิดข้อผิดพลาดในการลบ',
                            'error'
                        );
                    }
                })
                .catch(err => {
                    Swal.fire(
                        'Error!',
                        err.message,
                        'error'
                    );
                });
        }
    });
}

function deletePeriod(id) {
    Swal.fire({
        title: 'ยืนยันลบงวดนี้?',
        text: "⚠️ คำเตือน: ข้อมูลทั้งหมดในงวด (รายรับ/รายจ่าย/ยอดธนาคาร) จะถูกลบถาวร!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, ลบทุกอย่าง!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/periods/${id}`, {
                method: 'DELETE'
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire(
                            'ลบสำเร็จ!',
                            'งวดบัญชีถูกลบแล้ว.',
                            'success'
                        ).then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire(
                            'Error!',
                            data.error || 'เกิดข้อผิดพลาดในการลบ',
                            'error'
                        );
                    }
                })
                .catch(err => {
                    Swal.fire(
                        'Error!',
                        err.message,
                        'error'
                    );
                });
        }
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