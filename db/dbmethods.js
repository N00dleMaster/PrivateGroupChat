const { Pool } = require("pg");         // This is requiring node-postgres

const client = new Pool({
    user: "postgres",
    host: "localhost",
    database: "messages",
    password: "postgres",
    port:5432
});

client.connect();

module.exports = {
    interact: (text, callback) => {
      const start = Date.now()
      return client.query(text, (err, res) => {
        const duration = Date.now() - start
        console.log('executed query', { text, duration, rows: res.rowCount })
        callback(err, res)
      })
    },
  }