const path = require("path");

const { Pool } = require("pg");         // This is requiring node-postgres
const bcrypt = require("bcrypt");		// This is used to encrypt passwords

require("dotenv").config({              // For retrieving environment variables from .env file      
  path: path.join(__dirname, "..", ".env")
});

const client = new Pool({               // Establishing connection
    // user:     process.env.DATABASE_USERNAME,
    // host:     process.env.HOST,
    // database: process.env.DATABASE_NAME,
    // password: process.env.DATABASE_PASS,
    // port:     process.env.DATABASE_PORT
    connectionString: "postgres://gwpukowf:oiL3sci2zN1Lp6eMXrXPO3Tvv_sRJ1U2@queenie.db.elephantsql.com:5432/gwpukowf"
});

client.connect();                       // Connecting

module.exports = {                      // This is our interact method we're exporting
    interact: async (text, params, callback) => {
        return client.query(text, params, (err, res) => {
            callback(err, res)
        })
    },

    addUser: (username, password, pfp, colour, callback) => {
        // Make sure pfp has a value
        pfp = (pfp) ? pfp : "https://static.wikia.nocookie.net/59b26f0f-10bc-4aac-afe0-5372becc3674";
        // Make sure the username doesn't already exist
        client.query("SELECT * FROM users WHERE username = $1", [username], (err, res) => {
            if(err) {
                console.log(err)
				callback(false); // The callback's parameter hinges on whether or not we succeeded
            } else if(res.rowCount > 0) {
				console.log("User already exists!")
				callback(false);
			} else {
				client.query("INSERT INTO users (username, password, pfp, colour) VALUES($1, $2, $3, $4);", 
                [username, password, pfp, colour],
				(insertionErr, insertionResponse) => {
					if(insertionErr) {
						console.log("Could not insert new user: " + insertionErr);
						callback(false);
					} else {
						console.log(insertionResponse);
						callback(true);
					}
				})
			}
        })
    },

    deleteConversation: (conversation) => {
        client.query("DELETE FROM messages WHERE room = $1", [conversation])
    }

  }