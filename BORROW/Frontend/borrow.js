const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const Swal = require('sweetalert2');

const dbPath = path.join(__dirname, '../Backend/Borrow/books.db');
const userDBPath = ('\\\\DESKTOP-0ACG64R\\Backend\\users.db');

const db = new sqlite3.Database(dbPath);
const userDB = new sqlite3.Database(userDBPath);

window.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('userTable');
    table.innerHTML = '';

    const sqlQuery = 'SELECT borrow.*, accnum.accNum, books.bookTitle FROM borrow INNER JOIN accnum ON borrow.bookID = accnum.accNum INNER JOIN books ON accnum.bookNumber = books.bookNumber;';

    db.all(sqlQuery, [], (err, rows) => {
        if (err) {
            showError("Error fetching borrow data: " + err.message);
            return;
        }

        const promises = rows.map((row) => {
            return new Promise((resolve, reject) => {
                userDB.get('SELECT Name, IDNumber FROM user WHERE IDNumber = ?', [row.borrowerID], (err, userRow) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            borrowID: row.borrowID,
                            Name: userRow ? userRow.Name : 'N/A', 
                            IDNumber: userRow ? userRow.IDNumber : 'N/A',
                            accNum: row.accNum,
                            bookTitle: row.bookTitle,
                            dueDate: row.dueDate,
                            dateBorrowed: row.dateBorrowed,
                            timeBorrowed: row.timeBorrowed,
                        });
                    }
                });
            });
        });

        Promise.all(promises)
            .then((resultRows) => {
                resultRows.forEach((row, index) => {
                    let tr = document.createElement('tr');
                    tr.innerHTML = `<td></td>
                                    <td>${row.Name}</td>
                                    <td>${row.IDNumber}</td>
                                    <td>${row.accNum}</td>
                                    <td>${row.bookTitle}</td>
                                    <td>${row.dateBorrowed}</td>
                                    <td>${row.timeBorrowed}</td>
                                    <td>${row.dueDate}</td>`;
                    table.appendChild(tr);
                });
            })
            .catch((error) => {
                showError("Error fetching user data: " + error.message);
            });
    });
});

const tableBody = document.getElementById('userTable');
const searchBook = document.getElementById('search-book');
searchBook.addEventListener('input', function () {
    const searchTerm = searchBook.value.trim().toLowerCase();

    const tableRows = tableBody.querySelectorAll('tr');

    tableRows.forEach(row => {
        const idNumberCell = row.querySelector('td:nth-child(3)');
        const nameCell = row.querySelector('td:nth-child(2)');
        const accNumCell = row.querySelector('td:nth-child(4)');

        if (nameCell && idNumberCell && accNumCell) {
            const name = nameCell.textContent.toLowerCase();
            const idNumber = idNumberCell.textContent.toLowerCase();
            const accNum = accNumCell.textContent.toLowerCase();
        
            if (name.includes(searchTerm) || idNumber.includes(searchTerm) || accNum.includes(searchTerm)) {
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
        window.location.reload();
    });
}

