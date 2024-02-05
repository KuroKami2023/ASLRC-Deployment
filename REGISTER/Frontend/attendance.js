const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

document.addEventListener("DOMContentLoaded", function () {
    const dbAttendance = new sqlite3.Database('\\\\DESKTOP-0ACG64R\\Record\\attendance.db');
    const dbUser = new sqlite3.Database('\\\\DESKTOP-0ACG64R\\Backend\\users.db');
    const selectDate = document.querySelector('.form-select');
    const userTable = document.getElementById('userTable');

    printButton.addEventListener('click', function () {
        const selectedTable = selectDate.value;

        if (selectedTable !== 'Select Date') {
            printAttendanceTable(dbAttendance, dbUser, selectedTable);
        } else {
            console.log("Please select a valid date before printing.");
        }
    });

    selectDate.addEventListener('change', function () {
        const selectedTable = this.value;
        if (selectedTable !== 'Select Date') {
            displayAttendanceData(dbAttendance, dbUser, selectedTable);
        } else {
            userTable.innerHTML = '';
        }
    });

    fetchAttendanceTableNames(dbAttendance, selectDate);

    const searchDate = document.getElementById('search-date');

    searchDate.addEventListener('input', function () {
        const searchTerm = searchDate.value.trim();
        console.log("Search Term:", searchTerm);

        userTable.innerHTML = '';

        const searchQuery = `SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' AND name LIKE ?;`;

        dbAttendance.all(searchQuery, [`%${searchTerm.replace(/-/g, '_')}%`], function (err, results) {
            if (err) {
                console.error("Error executing date search query:", err.message);
                return;
            }

            console.log("Search Results:", results);
            results.sort((a, b) => {
                const dateA = getDateFromTableName(a.name);
                const dateB = getDateFromTableName(b.name);

                return dateB - dateA;
            });

            selectDate.innerHTML = '<option selected>Select Date</option>';

            for (const tableResult of results) {
                const tableName = tableResult.name;
                const option = document.createElement('option');
                option.value = tableName;
                option.text = formatTableName(tableName);
                selectDate.add(option);
            }
        });
    });

});

function openDatabase(dbPath) {
    const db = new sqlite3.Database(dbPath);
    return db;
}

function fetchAttendanceTableNames(dbAttendance, selectDate) {
    dbAttendance.all("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name DESC;", [], function (err, results) {
        if (err) {
            console.error("Error fetching table names:", err.message);
            return;
        }

        results.sort((a, b) => {
            const dateA = getDateFromTableName(a.name);
            const dateB = getDateFromTableName(b.name);

            return dateB - dateA;
        });

        selectDate.innerHTML = '<option selected>Select Date</option>';

        for (let i = 0; i < results.length; i++) {
            const tableName = results[i].name;
            const option = document.createElement('option');
            option.value = tableName;
            option.text = formatTableName(tableName);
            selectDate.add(option);
        }
    });
}

function getDateFromTableName(tableName) {

    const parts = tableName.split('_');
    const year = parseInt(parts[3], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    return new Date(year, month, day);
}

function formatTableName(tableName) {
    return tableName.replace('_', ': ').replace(/_/g, '-');
}

function displayAttendanceData(dbAttendance, dbUser, tableName) {
    const attendanceQuery = `SELECT * FROM ${tableName}`;
    const userQuery = `SELECT Name, IDNumber, Program, Year FROM user WHERE IDNumber = ?`;

    dbAttendance.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?;`, [tableName], function (tableErr, tableResult) {
        if (tableErr) {
            console.error("Error checking table existence:", tableErr.message);
            return;
        }

        if (!tableResult) {
            console.error(`Table ${tableName} does not exist in the attendance database.`);
            return;
        }

        dbAttendance.all(attendanceQuery, [], function (err, results) {
            if (err) {
                console.error("Error executing attendance query:", err.message);
                return;
            }

            const userTable = document.getElementById('userTable');
            userTable.innerHTML = '';

            results.sort((a, b) => {
                const nameA = (a.Name || '').toLowerCase();
                const nameB = (b.Name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            
            for (const row of results) {
                dbUser.get(userQuery, [row.IDNumber], function (userErr, userRow) {
                    if (userErr) {
                        console.error("Error executing user query:", userErr.message);
                        return;
                    }
            
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${userRow ? userRow.Name || '' : ''}</td>
                                    <td>${userRow ? userRow.IDNumber || '' : ''}</td>
                                    <td>${userRow ? userRow.Program || '' : ''}</td>
                                    <td>${userRow ? userRow.Year || '' : ''}</td>
                                    <td>${row.time_in || ''}</td>
                                    <td>${row.time_out || ''}</td>`;
            
                    userTable.appendChild(tr);
                });
            }            
        });
    });
}

const tableBody = document.getElementById('userTable');
const searchUser = document.getElementById('search-user');
searchUser.addEventListener('input', function () {
    const searchTerm = searchUser.value.trim().toLowerCase();

    const tableRows = tableBody.querySelectorAll('tr');

    tableRows.forEach(row => {
        const idNumberCell = row.querySelector('td:first-child');
        const nameCell = row.querySelector('td:nth-child(2)');

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

function printAttendanceTable(dbAttendance, dbUser, tableName) {
    const attendanceQuery = `SELECT * FROM ${tableName}`;
    const userQuery = `SELECT Name, IDNumber, Program, Year FROM user WHERE IDNumber = ?`;

    dbAttendance.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?;`, [tableName], function (tableErr, tableResult) {
        if (tableErr) {
            console.error("Error checking table existence:", tableErr.message);
            return;
        }

        if (!tableResult) {
            console.error(`Table ${tableName} does not exist in the attendance database.`);
            return;
        }

        dbAttendance.all(attendanceQuery, [], function (err, results) {
            if (err) {
                console.error("Error executing attendance query:", err.message);
                return;
            }

            const userPromises = [];

            for (const row of results) {
                const userPromise = new Promise((resolve, reject) => {
                    dbUser.get(userQuery, [row.IDNumber], function (userErr, userRow) {
                        if (userErr) {
                            console.error("Error executing user query:", userErr.message);
                            reject(userErr);
                        }

                        resolve({ row, userRow });
                    });
                });

                userPromises.push(userPromise);
            }

            Promise.all(userPromises)
                .then((resultsWithUser) => {
                    let tableContent = `<h2>Attendance Report: ${tableName.replace('attendance', '').replace('_', '').replace(/_/g, '-')}</h2>` +
                    '<table border="1" style="width:100%; text-align: center;">';
                    tableContent += '<tr><th>Name</th><th>IDNumber</th><th>Program</th><th>Year</th><th>Time In</th><th>Time Out</th></tr>';

                    for (const { row, userRow } of resultsWithUser) {
                        tableContent += `<tr><td>${userRow ? userRow.Name || '' : ''}</td>
                                         <td>${userRow ? userRow.IDNumber || '' : ''}</td>
                                         <td>${userRow ? userRow.Program || '' : ''}</td>
                                         <td>${userRow ? userRow.Year || '' : ''}</td>
                                         <td>${row.time_in || ''}</td>
                                         <td>${row.time_out || ''}</td></tr>`;
                    }

                    tableContent += '</table>';

                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(tableContent);
                    printWindow.document.close();
                    printWindow.print();
                })
                .catch((error) => {
                    console.error("Error in user queries:", error.message);
                });
        });
    });
}