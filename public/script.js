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
    document.getElementById('formTitle').innerHTML = "Add Customer";

    document.getElementById('name').value = "";
    document.getElementById('phone').value = "";
    document.getElementById('type').value = "";
    document.getElementById('amount').value = "";

    document.getElementById('formBox').style.display = "block";
}

function closeForm() {
    document.getElementById('formBox').style.display = "none";
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
    loadCustomers();
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
    customers.splice(i, 1);

    await fetch('/api/customers', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customers)
    });

    loadCustomers();
}


function callNow(phone) {
    fetch('/api/call', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
    });
}


loadCustomers();
