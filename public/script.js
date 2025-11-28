let editingIndex = null;

// Load customers.json
async function loadCustomers() {
    const res = await fetch('/api/customers');
    const data = await res.json();

    const tbody = document.querySelector("#customerTable tbody");
    tbody.innerHTML = "";

    data.forEach((c, i) => {
        tbody.innerHTML += `
      <tr>
        <td>${c.name}</td>
        <td>${c.phone}</td>
        <td>${c.type}</td>
        <td>${c.dueAmount}</td>
        <td>
          <button onclick="editCustomer(${i})">Edit</button>
          <button onclick="deleteCustomer(${i})">Delete</button>
          <button onclick="callNow('${c.phone}')">Call</button>
        </td>
      </tr>
    `;
    });
}

function openAddForm() {
    editingIndex = null;
    document.getElementById('formBox').style.display = "block";
}

function closeForm() {
    document.getElementById('formBox').style.display = "none";
}

async function saveCustomer() {
    const obj = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        type: document.getElementById('type').value,
        dueAmount: Number(document.getElementById('amount').value),
    };

    let url = '/api/customers';
    let method = 'POST';

    if (editingIndex !== null) {
        url = `/api/customers/${editingIndex}`;
        method = 'PUT';
    }

    await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj)
    });

    closeForm();
    loadCustomers();
}

async function editCustomer(i) {
    const res = await fetch('/api/customers');
    const data = await res.json();

    editingIndex = i;

    document.getElementById('name').value = data[i].name;
    document.getElementById('phone').value = data[i].phone;
    document.getElementById('type').value = data[i].type;
    document.getElementById('amount').value = data[i].dueAmount;

    document.getElementById('formBox').style.display = "block";
}

async function deleteCustomer(i) {
    await fetch(`/api/customers/${i}`, { method: 'DELETE' });
    loadCustomers();
}

function callNow(phone) {
    fetch(`/api/call/${phone}`);
}

loadCustomers();
