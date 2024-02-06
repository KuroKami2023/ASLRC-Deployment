const sqlite3 = require('sqlite3').verbose();
const Swal = require('sweetalert2');

document.addEventListener("DOMContentLoaded", function () {
    const dbAttendance = new sqlite3.Database('\\\\DESKTOP-0ACG64R\\Record\\attendance.db');
    const dbUser = new sqlite3.Database('\\\\DESKTOP-0ACG64R\\Backend\\users.db');
    const selectDate = document.querySelector('.form-select');
    const userTable = document.getElementById('userTable');
    
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    startDateInput.addEventListener('change', function () {
        updateTableWithDateRange(dbAttendance, dbUser, startDateInput.value, endDateInput.value);
    });

    endDateInput.addEventListener('change', function () {
        updateTableWithDateRange(dbAttendance, dbUser, startDateInput.value, endDateInput.value);
    });
    const printAllButton = document.getElementById('printallButton');
    const printButton = document.getElementById('printButton');

    printAllButton.addEventListener('click', function () {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (startDate && endDate) {
            printTableWithDateRange(startDate, endDate);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please select both start and end dates.'
            });
        }
    });

    printButton.addEventListener('click', function () {
        const selectedDate = selectDate.value;
        if (selectedDate && selectedDate !== 'Select Date') {
            printTableForSelectedDate(selectedDate);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please select date from the select date option only.'
            });
        }
    });

    function printTableWithDateRange(startDate, endDate) {
        const formattedStartDate = formatDateForTableName(startDate);
        const formattedEndDate = formatDateForTableName(endDate);
        const tableContent = document.getElementById('userTable').outerHTML;
        
        let printedContent = '';
        
        const headerRow = document.getElementById('tablee').outerHTML;
        printedContent += headerRow;

        const tableRows = document.querySelectorAll('#userTable tbody tr');
        tableRows.forEach(row => {
            printedContent += row.outerHTML;
        });

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Attendance Report: ${formattedStartDate.replace(/_/g, '-')} to ${formattedEndDate.replace(/_/g, '-')}</title>
                    <style>
                        ${getPrintStyles()}
                    </style>
                </head>
                <body>
                    <h1>Attendance Report: ${formattedStartDate.replace(/_/g, '-')} to ${formattedEndDate.replace(/_/g, '-')}</h1>
                    <table class="table table-dark table-hover" style="text-align: center;">
                    ${printedContent}    
                    ${tableContent}
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    function printTableForSelectedDate(selectedDate) {
        const printedTitle = `Attendance for ${selectedDate.replace('attendance_', '').replace(/_/g, '-')}`;
        const tableContent = document.getElementById('userTable').outerHTML;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${printedTitle}</title>
                    <style>
                        ${getPrintStyles()}
                    </style>
                </head>
                <body>
                    <h1>${printedTitle}</h1>
                    <table class="table table-dark table-hover" style="text-align: center;">
                        ${tableContent}
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
    
    function getPrintStyles() {
        return `
            body {
                font-family: Arial, sans-serif;
            }
            table {
                border-collapse: collapse;
                width: 100%;
            }
            th, td {
                border: 1px solid #dddddd;
                text-align: left;
                padding: 8px;
            }
            th {
                background-color: #f2f2f2;
            }
            tr:nth-child(even) {
                background-color: #dddddd;
            }
        `;
    }
    
    
    
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

    function formatDateForTableName(date) {
        const parts = date.split('-');
        return `${parts[1]}_${parts[2]}_${parts[0]}`;
    }
    
    function updateTableWithDateRange(dbAttendance, dbUser, startDate, endDate) {
        if (startDate && endDate) {
            const startDateTime = new Date(startDate).getTime();
            const endDateTime = new Date(endDate).getTime();
    
            if (startDateTime <= endDateTime) {
                const formattedStartDate = formatDateForTableName(startDate);
                const formattedEndDate = formatDateForTableName(endDate);
    
                const dateRangeQuery = `
                    SELECT name 
                    FROM sqlite_master 
                    WHERE type='table' 
                        AND name != 'sqlite_sequence' 
                        AND name >= 'attendance_${formattedStartDate}' 
                        AND name <= 'attendance_${formattedEndDate}';
                `;
    
                dbAttendance.all(dateRangeQuery, [], function (err, results) {
                    if (err) {
                        console.error("Error executing date range query:", err.message);
                        return;
                    }
    
                    userTable.innerHTML = '';
    
                    const headerRow = document.createElement('tr');
                    headerRow.innerHTML = `<th colspan="7" style="background: darkgray;">Attendance from ${formattedStartDate.replace(/_/g, '-')} to ${formattedEndDate.replace(/_/g, '-')}</th>`;
                    userTable.appendChild(headerRow);
    
                    results.forEach((tableResult) => {
                        const tableName = tableResult.name;
    
                        const attendanceQuery = `SELECT *, '${tableName}' as tableName FROM ${tableName}`;
                        dbAttendance.all(attendanceQuery, [], function (attendanceErr, attendanceResults) {
                            if (attendanceErr) {
                                console.error("Error executing attendance query:", attendanceErr.message);
                                return;
                            }
                            attendanceResults.forEach((row) => {
                                dbUser.get(`SELECT * FROM user WHERE IDNumber = ?`, [row.IDNumber], function (err, user) {
                                    if (err) {
                                        console.error("Error executing user query:", err.message);
                                        return;
                                    }
    
                                    const tr = document.createElement('tr');
                                    tr.innerHTML = `<td>${user ? user.Name || '' : ''}</td>
                                                    <td>${row.IDNumber || ''}</td>
                                                    <td>${user ? user.Program || '' : ''}</td>
                                                    <td>${user ? user.Year || '' : ''}</td>
                                                    <td>${row.time_in || ''}</td>
                                                    <td>${row.time_out || ''}</td>
                                                    <td>${row.tableName.replace('attendance_', '').replace(/_/g, '-') || ''}</td>`;
                                    userTable.appendChild(tr);
                                });
                            });
                        });
                    });
                });
            } else {
                console.error("Start date should be before or equal to end date.");
            }
        }
    }
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
        const programCell = row.querySelector('td:nth-child(3)');

        if (nameCell && idNumberCell && programCell) {
            const name = nameCell.textContent.toLowerCase();
            const idNumber = idNumberCell.textContent.toLowerCase();
            const program = programCell.textContent.toLowerCase();

            if (name.includes(searchTerm) || idNumber.includes(searchTerm) || program.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
});