const path = require("path");

const { Pool } = require("pg");         // This is requiring node-postgres
const bcrypt = require("bcrypt");		// This is used to encrypt passwords

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
    addUser: (username, password, callback) => {
        client.query("SELECT * FROM users WHERE username = $1", [username], (err, res) => {
            if(err) {
                console.log(err)
				callback(false); // The callback's parameter hinges on whether or not we succeeded
            } else if(res.rowCount > 0) {
				console.log("User already exists!")
				callback(false);
			} else {
				client.query("INSERT INTO users (username, password) VALUES($1, $2);", [username, password],
				(insertionErr, insertionResponse) => {
					if(insertionErr) {
						console.log("Could not insert new user: " + insertionError);
						callback(false);
					} else {
						console.log(insertionResponse);
						callback(true);
					}
				})
			}
        })
    }
  }