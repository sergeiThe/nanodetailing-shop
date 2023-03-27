const Pool = require('pg').Pool;



const connection = new Pool({
    host: "localhost",
    database: process.env.DB,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD // Change!
})


module.exports = connection