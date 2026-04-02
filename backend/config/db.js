const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "12345678",
  database: "healthmirror"
});

 db.connect((err) => {
   if (err) throw err;
   console.log("Connected to MySQL");
 });

module.exports = db;