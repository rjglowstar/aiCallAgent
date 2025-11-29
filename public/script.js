let customers = [];
let editingIndex = null;
let isScheduleSet = false; // Track if a schedule is currently saved

// Load customers.json
async function loadCustomers() {
    console.log("Loading customers...");

    const res = await fetch('/api/customers');
    customers = await res.json();

    const tbody = document.querySelector("#customerTable tbody");
    tbody.innerHTML = "";

        customers.forEach((c, i) => {
                tbody.innerHTML += `
            <tr>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td>${c.type}</td>
                <td>${c.dueAmount}</td>
                <td>
                    <div class="icon-row">
                        <button class="icon-btn edit" title="Edit" onclick="editCustomer(${i})">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                        </button>

                        <button class="icon-btn delete" title="Delete" onclick="deleteCustomer(${i})">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7z" fill="currentColor"/><path d="M9 4h6v2H9z" fill="currentColor"/></svg>
                        </button>

                        <button class="icon-btn call" title="Call" onclick="callNow('${c.phone}')">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.59.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.07 21 3 13.93 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.26.2 2.47.57 3.59a1 1 0 0 1-.24 1.01l-2.2 2.2z" fill="currentColor"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        });

        // Update total count
        const total = document.getElementById('totalCount');
        if (total) total.textContent = customers.length;
    }

function openAddForm() {
    editingIndex = null;
    document.getElementById('formTitle').innerHTML = "Add Customer";

    document.getElementById('name').value = "";
    document.getElementById('phone').value = "";
    document.getElementById('type').value = "";
    document.getElementById('amount').value = "";

    // show overlay + center popup
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'block';
    const box = document.getElementById('formBox');
    if (box) {
        box.style.display = 'block';
        box.setAttribute('aria-hidden', 'false');
    }

    setTimeout(()=> document.getElementById('name').focus(), 80);
}

function closeForm() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
    const box = document.getElementById('formBox');
    if (box) {
        box.style.display = 'none';
        box.setAttribute('aria-hidden', 'true');
    }
}

async function saveCustomer() {
    const obj = {
        name: document.getElementById("name").value,
        phone: document.getElementById("phone").value,
        type: document.getElementById("type").value,
        dueAmount: Number(document.getElementById("amount").value)
    };

    if (editingIndex === null) {
        customers.push(obj);       // ADD
    } else {
        customers[editingIndex] = obj;  // EDIT
    }

    await fetch('/api/customers', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customers)
    });

    closeForm();
    // wait for reload so UI is up-to-date, then show toast
    await loadCustomers();
    showToast('Customer details saved');
}


function editCustomer(i) {
    editingIndex = i;
    document.getElementById('formTitle').innerHTML = "Edit Customer";

    document.getElementById("name").value = customers[i].name;
    document.getElementById("phone").value = customers[i].phone;
    document.getElementById("type").value = customers[i].type;
    document.getElementById("amount").value = customers[i].dueAmount;

    document.getElementById('formBox').style.display = "block";
}

async function deleteCustomer(i) {
    // Show confirmation modal before deleting
    showConfirm('Are you sure you want to delete this customer?', async () => {
        customers.splice(i, 1);

        await fetch('/api/customers', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customers)
        });

        await loadCustomers();
        // show notification after successful delete
        showToast('Customer deleted');
    });
}


// Confirmation modal helpers
function showConfirm(message, onConfirm) {
    const overlay = document.getElementById('overlay');
    const box = document.getElementById('confirmBox');
    if (!box || !overlay) {
        // fallback to native confirm
        if (window.confirm(message)) onConfirm();
        return;
    }

    // set message
    const msg = box.querySelector('.confirm-message');
    if (msg) msg.textContent = message;

    // wire up buttons
    const yes = box.querySelector('.confirm-actions .primary');
    const no = box.querySelector('.confirm-actions .ghost');

    const clean = () => {
        if (yes) yes.onclick = null;
        if (no) no.onclick = null;
    };

    if (overlay) overlay.style.display = 'block';
    box.style.display = 'block';
    box.setAttribute('aria-hidden', 'false');

    if (yes) yes.onclick = () => { try { onConfirm(); } finally { clean(); closeConfirm(); } };
    if (no) no.onclick = () => { clean(); closeConfirm(); };
}

function closeConfirm() {
    const overlay = document.getElementById('overlay');
    const box = document.getElementById('confirmBox');
    if (overlay) overlay.style.display = 'none';
    if (box) { box.style.display = 'none'; box.setAttribute('aria-hidden', 'true'); }
}

// Toast helper
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const inner = document.getElementById('toastInner');
    if (!toast || !inner) {
        console.log('Toast:', message);
        return;
    }
    inner.textContent = message;
    toast.classList.add('show');
    // ensure pointer-events only when visible
    toast.style.pointerEvents = 'auto';
    setTimeout(() => {
        toast.classList.remove('show');
        toast.style.pointerEvents = 'none';
    }, duration);
}


function callNow(phone) {
    console.log('callNow invoked with', phone);
    // Show calling modal
    const customer = customers.find(c => c.phone === phone) || {};
    console.log('found customer', customer);
    showCalling(customer.name || phone, phone);

    fetch('/api/call', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
    }).then(async (res) => {
        let data = {};
        try { data = await res.json(); } catch (e) {}
        const status = document.getElementById('callStatus');
        if (status) status.textContent = data?.message || 'Call started';
        // close after a short delay
        setTimeout(closeCalling, 1800);
    }).catch((err) => {
        const status = document.getElementById('callStatus');
        if (status) status.textContent = 'Error starting call';
        setTimeout(closeCalling, 1800);
    });
}


function showCalling(name, phone) {
    console.log('showCalling', { name, phone });
    const overlay = document.getElementById('overlay');
    const box = document.getElementById('callBox');
    if (overlay) {
        overlay.style.display = 'block';
        overlay.style.pointerEvents = 'auto';
    }
    if (!box) {
        console.warn('callBox not found in DOM');
        return;
    }
    const title = document.getElementById('callToName');
    const phoneEl = document.getElementById('callPhone');
    const status = document.getElementById('callStatus');
    if (title) title.textContent = name || '';
    if (phoneEl) phoneEl.textContent = phone || '';
    if (status) status.textContent = 'We are calling the customer. Please wait...';
    box.style.display = 'block';
    box.setAttribute('aria-hidden', 'false');
}

function closeCalling() {
    const overlay = document.getElementById('overlay');
    const box = document.getElementById('callBox');
    if (overlay) overlay.style.display = 'none';
    if (box) { box.style.display = 'none'; box.setAttribute('aria-hidden', 'true'); }
}

// Handle schedule mode change
function onScheduleModeChange() {
    const mode = document.querySelector('input[name="scheduleMode"]:checked').value;
    const dailyTime = document.getElementById('dailyTime');
    const onceDatetime = document.getElementById('onceDatetime');
    const saveBtnDaily = document.getElementById('saveBtnDaily');
    const saveBtnOnce = document.getElementById('saveBtnOnce');
    
    if (mode === 'daily') {
        dailyTime.style.display = 'block';
        onceDatetime.style.display = 'none';
        saveBtnDaily.style.display = 'flex';
        saveBtnOnce.style.display = 'none';
    } else {
        dailyTime.style.display = 'none';
        onceDatetime.style.display = 'block';
        saveBtnDaily.style.display = 'none';
        saveBtnOnce.style.display = 'flex';
    }
}

// Update daily schedule
async function updateDailySchedule() {
    const timeInput = document.getElementById('dailyTime').value;
    if (!timeInput) {
        showToast('⚠ Please select a time', 2000);
        return;
    }
    
    // Preserve the selected time before calling loadSchedulerInfo
    const selectedTime = timeInput;
    
    const [hour, minute] = timeInput.split(':').map(Number);
    const cronExpression = `${minute} ${hour} * * *`;
    
    try {
        const res = await fetch('/api/scheduler/update-schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cronExpression })
        });
        
        const data = await res.json();
        if (!res.ok || data.success === false) {
            showToast('❌ ' + (data.error || 'Failed'), 2000);
            return;
        }
        
        showToast(`✅ Daily at ${timeInput}`, 2000);
        // Immediately update label and set flag before loadSchedulerInfo
        setScheduleLabelFromDaily(selectedTime);
        isScheduleSet = true;
        // Preserve the input value
        const dailyEl = document.getElementById('dailyTime');
        if (dailyEl) dailyEl.value = selectedTime;
        // Then sync with backend
        await loadSchedulerInfo();
    } catch (err) {
        showToast('❌ Error', 2000);
    }
}

// Schedule one-time call
async function scheduleOnceCall() {
    const datetimeInput = document.getElementById('onceDatetime').value;
    if (!datetimeInput) {
        showToast('⚠ Please select date and time', 2000);
        return;
    }
    
    // Preserve the selected datetime before calling loadSchedulerInfo
    const selectedDatetime = datetimeInput;
    
    const dateTime = new Date(datetimeInput).toISOString();
    
    try {
        const res = await fetch('/api/scheduler/schedule-once', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dateTime })
        });
        
        const data = await res.json();
        if (!res.ok || data.success === false) {
            showToast('❌ ' + (data.error || 'Failed'), 2000);
            return;
        }
        
        const dt = new Date(datetimeInput);
        showToast(`✅ Call at ${dt.toLocaleString()}`, 2000);
        // Immediately update label and set flag before loadSchedulerInfo
        setScheduleLabelFromOnce(selectedDatetime);
        isScheduleSet = true;
        // Preserve the input value
        const onceEl = document.getElementById('onceDatetime');
        if (onceEl) onceEl.value = selectedDatetime;
        // Then sync with backend
        await loadSchedulerInfo();
    } catch (err) {
        showToast('❌ Error', 2000);
    }
}

// Load scheduler info on page load
async function loadSchedulerInfo() {
    try {
        const res = await fetch('/api/scheduler/info');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        console.log('Scheduler info:', data);
        
        // Update toggle button state (Activate button removed from UI)
        const toggleBtn = document.getElementById('toggleBtn');
        if (toggleBtn) {
            if (data.isActive) {
                toggleBtn.classList.add('active');
                toggleBtn.textContent = '⏸ Pause';
            } else {
                toggleBtn.classList.remove('active');
                toggleBtn.textContent = '▶ Start';
            }
        }
        
        // Set schedule mode based on type
        const modeOnceEl = document.getElementById('modeOnce');
        const modeDailyEl = document.getElementById('modeDaily');
        if (modeOnceEl && data.scheduleType === 'once') {
            modeOnceEl.checked = true;
        } else if (modeDailyEl) {
            modeDailyEl.checked = true;
        }
        onScheduleModeChange();
        
        // Parse cron and populate inputs
        if (data.cronExpression) {
            const parts = data.cronExpression.split(' ');
            const minute = parseInt(parts[0]);
            const hour = parseInt(parts[1]);
            const day = parseInt(parts[2]);
            const month = parseInt(parts[3]);
            
            // Set daily time
            const timeStr = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
            const dailyEl = document.getElementById('dailyTime');
            if (dailyEl) dailyEl.value = timeStr;
            
            // Set one-time datetime if applicable
            if (day > 0 && day < 32) {
                let dt = new Date();
                dt.setHours(hour, minute, 0, 0);
                dt.setDate(day);
                if (month > 0 && month < 13) {
                    dt.setMonth(month - 1);
                }
                
                const isoString = dt.toISOString().slice(0, 16);
                const onceEl = document.getElementById('onceDatetime');
                if (onceEl) onceEl.value = isoString;
            }
        }
        
        // Update label to reflect saved schedule (prefer one-time if selected)
        const dailyEl = document.getElementById('dailyTime');
        const onceEl = document.getElementById('onceDatetime');
        if (data.scheduleType === 'once' && onceEl && onceEl.value) {
            setScheduleLabelFromOnce(onceEl.value);
            isScheduleSet = true;
        } else if (dailyEl && dailyEl.value) {
            setScheduleLabelFromDaily(dailyEl.value);
            isScheduleSet = true;
        } else {
            updateDateTimeDisplay();
            isScheduleSet = false;
        }
        
        // Update optional status badge and strike-through when paused
        const badge = document.getElementById('statusBadge');
        if (badge) badge.textContent = data.isActive ? 'Active' : 'Paused';
        const dtEl = document.getElementById('currentDateTime');
        if (dtEl) dtEl.classList.toggle('paused', !data.isActive);
    } catch (err) {
        console.error('Failed to load scheduler info:', err);
        showToast('⚠ Error loading', 2000);
    }
}

// Toggle scheduler Start/Pause
async function toggleScheduler() {
    try {
        const res = await fetch('/api/scheduler/toggle', { 
            method: 'POST',
            body: JSON.stringify({ toggle: true }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await res.json();
        
        if (!res.ok || data.success === false) {
            showToast('❌ ' + (data.error || 'Failed'), 2000);
            return;
        }
        
        const message = data.isActive ? '✅ Started' : '⏸ Paused';
        showToast(message, 1500);
        // reflect paused/active state on the label immediately
        const dtEl = document.getElementById('currentDateTime');
        if (dtEl) dtEl.classList.toggle('paused', !data.isActive);
        await loadSchedulerInfo();
    } catch (err) {
        showToast('❌ Error', 2000);
    }
}

// Update current date and time display
function updateDateTimeDisplay() {
    // Only update to current time if no schedule is set; otherwise keep showing the schedule
    if (isScheduleSet) return;
    
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
    const formatted = now.toLocaleDateString('en-US', options);
    const dateTimeEl = document.getElementById('currentDateTime');
    if (dateTimeEl) {
        dateTimeEl.textContent = formatted;
    }
}

// Set label to show daily schedule time (used after selecting or saving)
function setScheduleLabelFromDaily(timeStr) {
    const el = document.getElementById('currentDateTime');
    if (!el) return;
    if (!timeStr) {
        updateDateTimeDisplay();
        return;
    }
    el.textContent = `Daily at ${timeStr}`;
}

// Set label to show one-time scheduled datetime
function setScheduleLabelFromOnce(isoDatetime) {
    const el = document.getElementById('currentDateTime');
    if (!el) return;
    if (!isoDatetime) {
        updateDateTimeDisplay();
        return;
    }
    const dt = new Date(isoDatetime);
    if (isNaN(dt.getTime())) {
        updateDateTimeDisplay();
        return;
    }
    el.textContent = dt.toLocaleString();
}

// Activate scheduler (turn on)
async function activateScheduler() {
    try {
        const res = await fetch('/api/scheduler/toggle', {
            method: 'POST',
            body: JSON.stringify({ isActive: true }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await res.json();
        
        if (!res.ok || data.success === false) {
            showToast('❌ ' + (data.error || 'Failed'), 2000);
            return;
        }
        
        showToast('✅ Scheduler activated', 1500);
        await loadSchedulerInfo();
    } catch (err) {
        showToast('❌ Error', 2000);
    }
}

loadCustomers();
loadSchedulerInfo();
updateDateTimeDisplay();
// Update date/time every minute
setInterval(updateDateTimeDisplay, 60000);

// Attach input listeners so selecting a time/date updates the label immediately
(function attachScheduleInputs(){
    const dailyInput = document.getElementById('dailyTime');
    if (dailyInput) {
        // Only update label when the user finishes editing (blur event), not during typing
        dailyInput.addEventListener('change', (e) => setScheduleLabelFromDaily(e.target.value));
    }
    const onceInput = document.getElementById('onceDatetime');
    if (onceInput) {
        // Only update label when the user finishes editing (blur event), not during typing
        onceInput.addEventListener('change', (e) => setScheduleLabelFromOnce(e.target.value));
        // Set default to today at current time if not already set
        if (!onceInput.value) {
            const now = new Date();
            const isoString = now.toISOString().slice(0, 16);
            onceInput.value = isoString;
        }
    }
})();


function toggleSchedulePanel() {
    const panel = document.getElementById("schedulePanel");

    if (panel.style.display === "none") {
        panel.style.display = "flex";
    } else {
        panel.style.display = "none";
    }
}

