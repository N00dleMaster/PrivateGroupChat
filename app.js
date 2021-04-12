
const path = require("path");

const db = require("./db/dbmethods.js");// Require our PostGres methods

const express = require("express");         // Require express
const app = express();                      // execute express constructor to get the app object
const http = require("http").Server(app);   // Require http, and pass express instance to it.
const io = require("socket.io")(http);      // Require socket.io, pass http server to it
                                            //   --> Socket.io works by being attached onto an http server instance

// express.static() sets up any "static" files we'll need to serve.
// Our front-end html, css, and scripts are all static resources, so this is a kewlio.
app.use(express.static(path.join(__dirname, "assets")));

// The "views" folder is the folder where we store our ejs templates
app.set("views", path.join(__dirname, "front-end"));
app.set("view engine", "ejs");


// // ESTABLISH CONNECTION WITH DATABASE
// const client = new Pool({
//     user: "postgres",
//     host: "localhost",
//     database: "messages",
//     password: "postgres",
//     port:5432
// });
// client.connect();

// const query = "SELECT * FROM messages";

// client.query(query)
//       .then(res => {
//           console.log(res.rows);
//       })
//       .catch(err => {
//           console.log(err);
//       })
//       .finally(() => {
//           client.end();
//       });


app.get("/", (req, res) => {
    let allResults;
    db.interact("SELECT * FROM messages", (err, dbRes) => {
        if(err) {
            console.log("Err at line 49: " + err);
        } else {
            console.log("success");
            allResults = dbRes.rows;
            res.render(path.join(__dirname, "front-end", "index.ejs"), {allResults: allResults});
        }
    })
})


// Each connection makes a new instance of the socket object
// Within here, we can handle all sorts of events that will be received from the client-side
// (whenver a person connects or interacts with the webpage) 
io.on("connection", socket => {       
    console.log("A wild user appeared! ");

    // This "chat_message" event is custom. We've named it ourself. Check out
    // index.js. Submitting the form triggers
    // a "chat_message" event which we define. This event is a socket event,
    // and is handled here.
    socket.on("chat_message", (msg, author) => {
        // io.emit() emits information to *all* the connected sockets. This is then
        // handled *again* on the client side. (see index.html)
        io.emit("chat_message", msg, author);
        // Because socket.io also has this handler on the backend, we can append the new
        // message to our database!!!! Epic.
        db.interact(`INSERT INTO messages (author, message, isPrivate) VALUES ('${author}', '${msg}', FALSE)`,
                (err, res) => {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("Added new message:\n" + res.rows);
                    }
                });
    });

    // The disconnect event is built into socket
    socket.on("disconnect", () => {  
        console.log("A COMRADE HAS LEFT US! :(");
    })
});


// Initializing the server on localhost for now.
http.listen("8080", () => {
    console.log("Listening on port 8080");
}); 