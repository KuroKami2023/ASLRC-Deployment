const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const Swal = require('sweetalert2');

const dbPath = path.join(__dirname, '../Backend/Borrow/books.db');
const userDBPath = ('\\\\DESKTOP-0ACG64R\\Backend\\users.db');

const db = new sqlite3.Database(dbPath);
const userDB = new sqlite3.Database(userDBPath);
let bid = "";

window.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('userTable');
    table.innerHTML = '';

    const sqlQuery = `
    SELECT 
        borrow.*, 
        accnum.accNum, 
        books.bookTitle,
        return.overDueFine 
    FROM 
        borrow 
    INNER JOIN 
        accnum ON borrow.bookID = accnum.accNum 
    INNER JOIN 
        books ON accnum.bookNumber = books.bookNumber
    LEFT JOIN
        return ON borrow.borrowID = return.borrowID
        WHERE borrow.dueDate IS NOT NULL AND return.dateReturned IS NULL;
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
                            dueDate: row.dueDate,
                            overDueFine: row.overDueFine
                        });
                    }
                });
            });
        });

        Promise.all(promises)
            .then((resultRows) => {
                const currentDate = new Date();
                resultRows.forEach((row) => {
                    const dueDate = new Date(row.dueDate);
                    const hoursLate = Math.max(0, (currentDate - dueDate) / (60 * 60 * 1000));

                    if (row.overDueFine < 0) {
                        return;
                    }

                    if (hoursLate > 0) {
                        db.run('UPDATE return SET overDueFine = ? WHERE borrowID = ?', [hoursLate * 2, row.borrowID], (err) => {
                            if (err) {
                                showError("Error updating overDueFine: " + err.message);
                            }
                        });
                    }

                    let tr = document.createElement('tr');
                    tr.style.height = '40px';
                    tr.id = `row-${row.borrowID}`;
                    tr.innerHTML = `<td></td>
                        <td>${row.Name}</td>
                        <td>${row.IDNumber}</td>
                        <td>${row.accNum}</td>
                        <td>${row.bookTitle}</td>
                        <td>${row.dueDate}</td>`;

                    if (hoursLate > 0) {
                        tr.style.backgroundColor = 'red';
                        const overdueFine = hoursLate * 2;
                        tr.innerHTML += `<td>₱ <input type='number' id='odf' value='${overdueFine.toFixed(2)}'>
                        </td>`;
                        tr.innerHTML += `<td style="background-color: #212429;">
                            <button type="button" class="btn btn-outline-info" onclick="payFine('${row.borrowID}', ${overdueFine}, '${row.Name}', '${row.IDNumber}', '${row.accNum}', '${row.bookTitle}')">Pay</button>
                        </td>`;
                    } else {
                        tr.innerHTML += `<td>₱ 0.00</td>`;
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

let isPaymentSuccessful = false;

function payFine(bid, overDueFine, borrowerName, IDNumber, accNum, bookTitle) {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString();
    const receipt = {
        TransactionID: generateTransactionID(),
        BorrowerName: borrowerName,
        IDNumber: IDNumber,
        AccNum: accNum,
        BookTitle: bookTitle,
        OverDueFine: overDueFine.toFixed(2),
    };

    updateOnShelfStatus(accNum);

    printReceipt(receipt);

    window.onbeforeunload = function () {
        if (!isPaymentSuccessful) {
            showError("Payment unsuccessful. Please print the receipt.");
        } else {
            db.run(`UPDATE return SET overDueFine = 0, dateReturned = ?, timeReturned = ? WHERE borrowID = ?`, [currentDate, currentTime, bid], (err) => {
                if (err) {
                    showError("Error clearing overDueFine: " + err.message);
                } else {
                    isPaymentSuccessful = true;
                }
            });
        }
    };
}

function updateOnShelfStatus(accNum) {
    db.run('UPDATE books SET onShelf = "Yes" WHERE bookNumber = ?', [accNum], (err) => {
        if (err) {
            showError("Error updating onShelf status: " + err.message);
        }
    });
}

function printReceipt(receipt) {
    const printWindow = window.open('', '_blank');
    const inputField = document.getElementById(`odf`);
    const newOverdueFine = inputField.value;
    const receiptString = `Transaction ID: ${receipt.TransactionID}
                           Borrower Name: ${receipt.BorrowerName}
                           ID Number: ${receipt.IDNumber}
                           Accession Number: ${receipt.AccNum}
                           Book Title: ${receipt.BookTitle}
                           Overdue Fine: ₱ ${receipt.OverDueFine}`;

    printWindow.document.write('<html><head><title>Acknowledgement Receipt</title></head><body>');
    printWindow.document.write('<div style="text-align: left; margin: 0; font-family: monospace;">' +
    "<h1 style='background-color: gray; padding: 5px; text-align: center; width: 50%;'>" +
    "<div><img src='images/logo.png' style='width: 60px; margin-top: 1rem; margin-right: 1rem;'></div> DIVINE WORD COLLEGE OF LAOAG" +
    "<br>Acknowledgement Receipt - Overdue</h2>" + 
    `<p>Transaction ID: ${receipt.TransactionID}</p>
    <p>Borrower Name: ${receipt.BorrowerName}</p>
    <p>ID Number: ${receipt.IDNumber}</p>
    <p>Accession Number: ${receipt.AccNum}</p>
    <p>Book Title: ${receipt.BookTitle}</p>
    <p>Overdue Fine: ₱ ${newOverdueFine}</p>
    ` +'</div>');
    printWindow.document.write('</body></html>');

    printWindow.document.close();

    printWindow.print();

    printWindow.onafterprint = function () {
        isPaymentSuccessful = true;

        window.onbeforeunload = null;
    };

    printWindow.onbeforeunload = function () {
        showError("Payment unsuccessful. Please print the receipt.");
    };
}



function generateTransactionID() {
    return Math.floor(Math.random() * 1000000);
}
