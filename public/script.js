let customers = [];
let editingIndex = null;

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


loadCustomers();
