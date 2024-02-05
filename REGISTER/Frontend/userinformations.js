const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const Swal = require('sweetalert2');
const XLSX = require('xlsx');

const dbPath = path.join('\\\\DESKTOP-0ACG64R\\Backend\\users.db');
const db = new sqlite3.Database(dbPath);

const fileInput = document.getElementById('fileInput');

window.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('userTable');
    table.innerHTML = '';

    db.all('SELECT * FROM user ORDER BY Name', [], (err, rows) => {
        if (err) {
            showError("Error fetching user data: " + err.message);
            return;
        }
        const table = document.getElementById('userTable');
        rows.forEach((row, index) => {
            let tr = document.createElement('tr');
            tr.innerHTML = `<td>${index + 1}</td>
                            <td>${row.IDNumber}</td>
                            <td>${row.Name}</td>
                            <td>${row.Program}</td>
                            <td>${row.Year}</td>
                            <td>
                            <button type="button" class="btn btn-outline-info" onclick="updateUser(${row.UserID})">Update</button>
                            |
                            <button type="button" class="btn btn-outline-danger" onclick="deleteUser(${row.UserID})">Delete</button>
                            </td>`;
            table.appendChild(tr);
        });
    });
});



const tableBody = document.getElementById('userTable');
const searchUser = document.getElementById('search-user');
searchUser.addEventListener('input', function () {
    const searchTerm = searchUser.value.trim().toLowerCase();

    const tableRows = tableBody.querySelectorAll('tr');

    tableRows.forEach(row => {
        const idNumberCell = row.querySelector('td:nth-child(2)');
        const nameCell = row.querySelector('td:nth-child(3)');

        if (nameCell && idNumberCell) {
            const name = nameCell.textContent.toLowerCase();
            const idNumber = idNumberCell.textContent.toLowerCase();

            if (name.includes(searchTerm) || idNumber.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
});

function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
    });
}

function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Success',
        text: message,
    }).then(() => {
        const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
        addUserModal.hide();
        document.getElementById('addUserForm').reset();
        window.location.reload();
    });
}

function deleteUser(userId) {
    Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!"
    }).then((result) => {
        if (result.isConfirmed) {
            db.run(`DELETE FROM user WHERE UserID = ?`, [userId], function (err) {
                if (err) {
                    showError("Error deleting user: " + err.message);
                    return;
                }
                Swal.fire({
                    title: "Deleted!",
                    text: "User with ID " + userId + " has been deleted.",
                    icon: "success"
                }).then(() => {
                    window.location.reload();
                })
            });
        }
    });
}

function handleFileInputChange(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const headers = ['IDNumber', 'Name', 'Program', 'Year'];

            const rows = XLSX.utils.sheet_to_json(worksheet, { header: headers });

            rows.forEach(row => {
                console.log('Row Data:', row);

                const IDNumber = row.IDNumber || row[0];
                const Name = row.Name || row[1];
                const Program = row.Program || row[2];
                const Year = row.Year || row[3];

                const headname = "Name";

                if (Name !== headname) {
                    const existingUserQuery = 'SELECT * FROM user WHERE IDNumber = ? OR Name = ?';
                    db.get(existingUserQuery, [IDNumber, Name], (err, existingUser) => {
                        if (err) {
                            console.error(err.message);
                            return;
                        }

                        if (!existingUser) {
                            db.run('INSERT INTO user (IDNumber, Name, Program, Year) VALUES (?, ?, ?, ?)',
                                [IDNumber, Name, Program, Year], function (err) {
                                    if (err) {
                                        console.error(err.message);
                                    }
                                });
                        } else {
                            console.log(`User with IDNumber ${IDNumber} or Name ${Name} already exists, skipping.`);
                        }
                    });
                } else {
                    console.log(`Skipping row with Name "${headname}".`);
                }
            });

            showSuccess('Data imported successfully');
        };

        reader.readAsArrayBuffer(file);
    }
}

fileInput.addEventListener('change', handleFileInputChange);

function updateUser(userId) {
    db.get('SELECT * FROM user WHERE UserID = ?', [userId], (err, user) => {
        if (err) {
            showError("Error fetching user data for update: " + err.message);
            return;
        }

        const updateIDNumberInput = document.getElementById('updateIDNumber');
        const updateNameInput = document.getElementById('updateName');
        const updateProgramInput = document.getElementById('updateProgram');
        const updateYearInput = document.getElementById('updateYear');

        updateIDNumberInput.value = user.IDNumber;
        updateNameInput.value = user.Name;
        updateProgramInput.value = user.Program;
        updateYearInput.value = user.Year;

        const updateUserModal = new bootstrap.Modal(document.getElementById('updateUserModal'));
        updateUserModal.show();

        const updateUserForm = document.getElementById('updateUserForm');
        updateUserForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const newIDNumber = updateIDNumberInput.value;
            const newName = updateNameInput.value;
            const newProgram = updateProgramInput.value;
            const newYear = updateYearInput.value;

            db.run('UPDATE user SET IDNumber = ?, Name = ?, Program = ?, Year = ? WHERE UserID = ?',
                [newIDNumber, newName, newProgram, newYear, userId], function (err) {
                    if (err) {
                        showError('Failed to update user information: ' + err.message);
                    } else {
                        updateUserModal.hide();
                        Swal.fire({
                            title: "Success!",
                            text: "User information updated successfully.",
                            icon: "success"
                        }).then(() => {
                            window.location.reload();
                        })
                    }
                });
        });
    });
}
