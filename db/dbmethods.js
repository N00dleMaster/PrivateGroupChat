const path = require("path");

const pgp =    require("pg-promise")();   // This is requiring node-postgres
const bcrypt = require("bcrypt");		// This is used to encrypt passwords

require("dotenv").config({              // For retrieving environment variables from .env file      
  path: path.join(__dirname, "..", ".env")
});

const client = pgp(process.env.DATABASE_URL);

client.connect();                       // Connecting

module.exports = {                      // This is our interact method we're exporting
    interact: async (text, params, callback) => {
        try {
            const res = await client.any(text, params);
            callback(undefined, res);
        } catch (e) {
            console.log(e);
        }
    },

    addUser: async (username, password, pfp, colour, callback) => {
        // Make sure pfp has a value
        pfp = (pfp) ? pfp : "https://static.wikia.nocookie.net/59b26f0f-10bc-4aac-afe0-5372becc3674";
        // Make sure the username doesn't already exist
        try {
            const users = await client.any("SELECT * FROM users WHERE username = $1", [username])    
        } catch(e) {
            console.log(e);
            callback(false);
            return;
        }
        if(users.length > 0) {
            console.log("User already exists!")
            callback(false);
            return;
        }
        // Then insert the new user
        try {
            await client.none("INSERT INTO users (username, password, pfp, colour) VALUES($1, $2, $3, $4);", [username, password, pfp, colour]);
            callback(true);
        } catch(e) {
            console.log("Could not insert new user, although the user does NOT exist: " + e);
            callback(false);
            return;
        }
    },

    getRooms: async (userId) => {
        try {
            const rooms = await client.any("SELECT * FROM browse_rooms WHERE user_id=$1;", [userId]);
            return rooms;
        } catch (e) {
            console.log(e);
            return null;
        }
    },
  }