const path = require("path");

const { Pool } = require("pg");         // This is requiring node-postgres

require("dotenv").config({              // For retrieving environment variables from .env file      
  path: path.join(__dirname, "..", ".env")
});

const client = new Pool({               // Establishing connection
    user:     process.env.DATABASE_USERNAME,
    host:     process.env.HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASS,
    port:     process.env.DATABASE_PORT
});

client.connect();                       // Connecting

module.exports = {                      // This is our interact method we're exporting
    interact: (text, params, callback) => {
      const start = Date.now()
      return client.query(text, params, (err, res) => {
        const duration = Date.now() - start
        // console.log('executed query', { text, duration, rows: res.rowCount })
        callback(err, res)
      })
    },
  }