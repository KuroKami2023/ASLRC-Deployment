const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const Swal = require('sweetalert2');
const XLSX = require('xlsx');

const dbPath = path.join(__dirname, '../Backend/Borrow/books.db');
const db = new sqlite3.Database(dbPath);

const fileInput = document.getElementById('fileInput');

window.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('userTable');
    table.innerHTML = '';

    const sqlQuery = 'SELECT books.*, accnum.accNum FROM books INNER JOIN accnum ON books.bookNumber = accnum.bookNumber';

    db.all(sqlQuery, [], (err, rows) => {
        if (err) {
            showError("Error fetching user data: " + err.message);
            return;
        }
        const table = document.getElementById('userTable');
        rows.forEach((row, index) => {
            let tr = document.createElement('tr');
            tr.innerHTML = `<td>${index + 1}</td>
                            <td>${row.accNum}</td>
                            <td>${row.bookNumber}</td>
                            <td>${row.bookTitle}</td>
                            <td>${row.author}</td>
                            <td>${row.onShelf}</td>
                            <td>
                                <button type="button" class="btn btn-outline-info" onclick="updateBook(${row.bookNumber})">Update</button>
                                |
                                <button type="button" class="btn btn-outline-danger" onclick="deleteUser(${row.bookNumber})">Delete</button>
                            </td>`;
            table.appendChild(tr);
        });
    });
});


const tableBody = document.getElementById('userTable');
const searchBook = document.getElementById('search-book');
searchBook.addEventListener('input', function () {
    const searchTerm = searchBook.value.trim().toLowerCase();

    const tableRows = tableBody.querySelectorAll('tr');

    tableRows.forEach(row => {
        const idNumberCell = row.querySelector('td:nth-child(2)');
        const nameCell = row.querySelector('td:nth-child(3)');
        const titleCell = row.querySelector('td:nth-child(4)');

        if (nameCell && idNumberCell && titleCell) {
            const name = nameCell.textContent.toLowerCase();
            const idNumber = idNumberCell.textContent.toLowerCase();
            const title = titleCell.textContent.toLowerCase();

            if (name.includes(searchTerm) || idNumber.includes(searchTerm) || title.includes(searchTerm)) {
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

function deleteUser(bookNumber) {
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
            db.run(`DELETE FROM books WHERE bookNumber = ?`, [bookNumber], 
            function (err) {
                    if (err) {
                        showError('Failed to delete book information: ' + err.message);
                    } else {
                        db.run(
                            'DELETE FROM accnum WHERE bookNumber = ?',
                            [bookNumber],
                            function (err) {
                                if (err) {
                                    showError('Failed to delete accnum information: ' + err.message);
                                } else {
                                    
                                }
                            }
                        );
                        showSuccess("Book information updated successfully.");
                    }
            });
        }
    });
}

function updateBook(bookNumber) {
    const sqlQuery = 'SELECT books.*, accnum.accNum FROM books INNER JOIN accnum ON books.bookNumber = accnum.bookNumber WHERE books.bookNumber = ?';

    db.get(sqlQuery, [bookNumber], (err, row) => {
        if (err) {
            showError("Error fetching books data for update: " + err.message);
            return;
        }

        const updateAccNum = document.getElementById('updateAccNum');
        const updateBookNum = document.getElementById('updateBookNum');
        const updateTitle = document.getElementById('updateTitle');
        const updateAuthor = document.getElementById('updateAuthor');

        if (row) {
            updateAccNum.value = row.accNum;
            updateBookNum.value = row.bookNumber;
            updateTitle.value = row.bookTitle;
            updateAuthor.value = row.author;

            const updateBookModal = new bootstrap.Modal(document.getElementById('updateBookModal'));
            updateBookModal.show();

            const updateBookForm = document.getElementById('updateBookForm');
            updateBookForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const newAccNum = updateAccNum.value;
                const newBookNum = updateBookNum.value;
                const newTitle = updateTitle.value;
                const newAuthor = updateAuthor.value;

                db.run(
                    'UPDATE books SET bookTitle = ?, author = ? WHERE bookNumber = ?',
                    [newTitle, newAuthor, newBookNum],
                    function (err) {
                        if (err) {
                            showError('Failed to update book information: ' + err.message);
                        } else {
                            db.run(
                                'UPDATE accnum SET accNum = ? WHERE bookNumber = ?',
                                [newAccNum, newBookNum],
                                function (err) {
                                    if (err) {
                                        showError('Failed to update accnum information: ' + err.message);
                                    } else {
                                        updateBookModal.hide();
                                    }
                                }
                            );
                            showSuccess("Book information updated successfully.");
                        }
                    }
                );
            });
        } else {
            showError("No data found for the specified bookNumber");
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

            const headers = ['Call', 'Title', 'Author', 'Barcode'];

            const rows = XLSX.utils.sheet_to_json(worksheet, { header: headers });

            rows.forEach(row => {

                const call = row['Call'] || row[0];
                const title = row['Title'] || row[1];
                const author = row['Author'] || row[2];
                const barcode = row['Barcode'] || row[3];

                if (title !== "Title") {
                    const existingBookQuery = 'SELECT * FROM books WHERE bookNumber = ? OR bookTitle = ?';
                    db.get(existingBookQuery, [call, title], (err, existingBook) => {
                        if (err) {
                            console.error(err.message);
                            return;
                        }

                        if (!existingBook) {
                            db.run('INSERT INTO books (bookNumber, bookTitle, author, onShelf) VALUES (?, ?, ?, ?)',
                            [call, title, author, "Yes"],
                            function (err) {
                                if (err) {
                                    console.error(err.message);
                                } else {
                                    const bookID = this.lastID;
                                    db.run('INSERT INTO accnum (bookNumber, accNum) VALUES (?, ?)',
                                        [call, barcode],
                                        function (err) {
                                            if (err) {
                                                console.error(err.message);
                                            }
                                        });
                                }
                            });

                            } else {
                        }
                    });
                } else {
                    console.log(`Skipping row with Title "${title}".`);
                }
            });

            showSuccess('Data imported successfully');
        };

        reader.readAsArrayBuffer(file);
    }
}
fileInput.addEventListener('change', handleFileInputChange);



