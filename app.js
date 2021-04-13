// =================================== REQUIRES ===================================
const path = require("path");               // For joining paths cross-platform
require("dotenv").config({                  // For retrieving environment variables from .env file      
    path: path.join(__dirname, ".env")
});

const db = require("./db/dbmethods.js");    // Require our Postgresql methods

const session = require("express-session"); // Express session is built into express, for auto-login using cookies
const passport = require("passport");       // Passport is what we use for our auth
const LocalStrategy =                       // Passport-local is the specific method we're using --
    require("passport-local").Strategy;     //      a simple username-password setup.
const bcrypt = require("bcrypt");           // This allows us to encrypt our passwords

const express = require("express");         // Require express
const { serializeUser } = require("passport");
const app = express();                      // execute express constructor to get the app object
const http = require("http").Server(app);   // Require http, and pass express instance to it.

const io = require("socket.io")(http);      // Require socket.io, pass http server to it
                                            //   --> Socket.io works by being attached onto an http server instance



// =================================== SETTING UP EXPRESS STUFF ===================================
// express.static() sets up any "static" files we'll need to serve.
// Our front-end html, css, and scripts are all static resources, so this is a kewlio.
app.use(express.static(path.join(__dirname, "assets")));

// The "views" folder is the folder where we store our ejs templates
app.set("views", path.join(__dirname, "front-end"));
app.set("view engine", "ejs");

// Body-parser is now part of express. We use it like this:
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

// Session is how we use login sessions with express. It gives a
// cookie to the browser so the user doesn't have to login 1000 times
app.use(session({ 
    secret: process.env.SECRET_SESSION_KEY,
    resave: false,
    saveUninitialized: true
}));
// Initializing passport
app.use(passport.initialize());
app.use(passport.session());


// =================================== PASSPORT STUFF ===================================
// This is our sign-up "strategy"
// passport.use("local-signup", new LocalStrategy({
//         usernameField :     "username",
//         passwordField :     "password",
//         passReqToCallback:  true
//     },
//     (req, username, password, done) => {
//         bcrypt.hash(password, 5, (hashErr, hash) =>{
//             if(hashErr) {
//                 console.log(hashErr);
//             } else {
//                 db.interact("SELECT * FROM users WHERE username = $1", [username],
//                 (queryError, query) =>{
//                     if(queryError) {
//                         console.log(queryError);
//                         return done(queryError);
//                     } else if(query.rowCount > 0) {
//                         console.log("User already exists!");
//                         return done(null, false);
//                     } else {
//                         db.interact("INSERT INTO users (username, password) VALUES($1, $2);",
//                             [username, hash], (insertionError, insertionResponse) => {
//                                 if(insertionError) {
//                                     console.log(insertionError);
//                                     return done(insertionError);
//                                 } else {
//                                     console.log(insertionResponse);
//                                     return done(null, false);
//                                 }
//                         });
//                     }
//                 });

//             }
            
//         })
//     }
// ));


// =================================== ROUTES ===================================
app.get("/", (req, res) => {
    res.redirect("/signup");
})

// Our sign-up route
app.get("/signup", (req, res) => {
    res.render(path.join(__dirname, "front-end", "signup.ejs"));
});
// We add the user into our db here
app.post("/signup", (req, res) => {
    bcrypt.hash(req.body.password, 5, (hashErr, hash) => {
        if(hashErr) {
            console.log("Unable to hash password: " + hashErr)
        } else {
            db.addUser(username, hash, (success) => {
				console.log("Insertion status: " + success)
				res.redirect("/login");
			});
        }
    })
})


app.get("/login", (req, res) => {
    res.render(path.join(__dirname, "front-end", "login.ejs"))
});

app.get("/app", (req, res) => {
    let allResults;
    // Query our db for all messages, and then pass this into our index.ejs file as a JSON obj.
    db.interact("SELECT * FROM messages", (err, dbRes) => {
        if(err) {
            console.log(err);
        } else {
            console.log("success");
            allResults = dbRes.rows;
            res.render(path.join(__dirname, "front-end", "chat.ejs"), {allResults: allResults});
        }
    });
})



// =================================== SOCKET.IO HANDLING ===================================
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
        db.interact(
            "INSERT INTO messages (authorid, authorname, message, isPrivate) VALUES (1, $1, $2, FALSE)",
            ["NoodleMaster", msg],
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