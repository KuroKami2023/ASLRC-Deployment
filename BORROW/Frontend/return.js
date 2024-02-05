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

    const sqlQuery = `
        SELECT 
            borrow.*, 
            accnum.accNum, 
            books.bookTitle, 
            return.dateReturned, 
            return.timeReturned 
        FROM 
            borrow 
            INNER JOIN accnum ON borrow.bookID = accnum.accNum 
            INNER JOIN books ON accnum.bookNumber = books.bookNumber
            LEFT JOIN return ON borrow.borrowID = return.borrowID;
    `;

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
                            dateReturned: row.dateReturned,
                            timeReturned: row.timeReturned,
                        });
                    }
                });
            });
        });

        Promise.all(promises)
    .then((resultRows) => {
        // Sort the rows to display "Not Returned" entries at the top
        resultRows.sort((a, b) => {
            if (a.dateReturned === null && b.dateReturned === null) {
                return 0; // both are "Not Returned"
            } else if (a.dateReturned === null) {
                return -1; // a is "Not Returned", should come first
            } else if (b.dateReturned === null) {
                return 1; // b is "Not Returned", should come first
            } else {
                // Sort by dateReturned if both have return dates
                return a.dateReturned.localeCompare(b.dateReturned);
            }
        });

        resultRows.forEach((row) => {
            let tr = document.createElement('tr');
            tr.innerHTML = `<td></td>
                            <td>${row.Name}</td>
                            <td>${row.IDNumber}</td>
                            <td>${row.accNum}</td>
                            <td>${row.bookTitle}</td>`;
            if (row.dateReturned !== null && row.timeReturned !== null) {
                tr.innerHTML += `<td>${row.dateReturned}</td>
                                <td>${row.timeReturned}</td>`;
            } else {
                tr.innerHTML += `<td>Not Returned</td>
                                <td>Not Returned</td>`;
            }
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

