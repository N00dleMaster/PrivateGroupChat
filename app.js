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
const flash = require("connect-flash");     // This allows us to flash error messages (for failed login, etc.)

const express = require("express");         // Require express
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
// Flash allows us to "flash" error and success messages to the user.
app.use(flash());


// =================================== PASSPORT STUFF ===================================
// This is our login "strategy"
passport.use(new LocalStrategy( 
    {passReqToCallback: true}, 
    (req, username, password, done) => {
        let user;
        db.interact("SELECT * FROM users WHERE username = $1", [username], (err, res) => {
            if(err) {
                console.log(err);
                return done(err);
            } else if(res.rowCount > 0) {
                console.log("Got user!")
                user = res.rows[0];
                bcrypt.compare(password, user.password, (err, wasCorrect) => {
                    if(err) {
                        console.log(err);
                    } else if (wasCorrect) {
                        return done(null, {
                            id: user._id,
                            user: user.username
                        });
                    } else {
                        console.log("Password was incorrect");
                        return done(null, false, req.flash("error", "Password is incorrect."));
                    }
                })
            } else {
                console.log("User does not exist");
                return done(null, false, req.flash("error", "User does not exist."));
            }
        })
    }
));

// Serializing the user into a session (giving a cookie to browser)
passport.serializeUser(function(user, done){
    console.log("serialize user is executing")
    done(null, user.id);
})

// Deserializing is used on every subsequent request *after* the initial login
passport.deserializeUser(function(id, done){
    db.interact('SELECT _id, username FROM users WHERE _id = $1', [parseInt(id)], (err, res) => {
        if(err) {
          return done(err)
        }
        return done(null, res.rows[0])
	});
});


// =================================== ROUTES ===================================
// home page is yet to be made
app.get("/", (req, res) => {
    res.redirect("/signup");
})


// Our sign-up route
app.get("/signup", (req, res) => {
    res.render(path.join(__dirname, "front-end", "signup.ejs"), {message: req.flash("signup_message")});
});
// We add the user into our db here
app.post("/signup", (req, res) => {
	// encrypt our password and add into db
    bcrypt.hash(req.body.password, 5, (hashErr, hash) => {
        if(hashErr) {
            console.log("Unable to hash password: " + hashErr)
        } else {
            db.addUser(req.body.username, hash, (success) => {
				console.log("Insertion status: " + success);
                if(success) {
                    res.redirect("/login");
                } else {
                    req.flash("signup_message", "Username is taken.");
                    res.redirect("/signup")
                }
			});
        }
    })
})


// Our login page, and the POST method for it.
app.get("/login", (req, res) => {
	// If user already logged in, send to /app.
	if(req.user) {
		res.redirect("/app");
	} else {
		res.render(path.join(__dirname, "front-end", "login.ejs"), {status: req.flash("error")})
	}
});
// Post method for login. Here is where we actually log them in.
app.post("/login", passport.authenticate("local", {
        successRedirect: "/app",
        failureRedirect: "/login",
        failureFlash: true
    }), 
    function (req, res) {
        if(req.user) {
            res.redirect("/app");
        } else {
            console.log("Login unsuccessful");
            res.redirect("/login");
        }
})


app.get("/app", (req, res) => {
	if(!req.user) {
		res.redirect("/login");
	}
    // Query our db for all messages, and then pass this into our index.ejs file as a JSON obj.
    db.interact("SELECT * FROM messages", (err, dbRes) => {
        if(err) {
            console.log(err);
        } else {
            console.log("Successfully loaded messages.");
            let allPrivate = [];
            let allGeneral = [];
            dbRes.rows.forEach((result) => {
                if(result.isprivate) {
                    allPrivate.push(result);
                } else {
                    allGeneral.push(result);
                }
            })
            res.render(path.join(__dirname, "front-end", "chat.ejs"), 
                {allPrivate: allPrivate, allGeneral: allGeneral, user: req.user});
            // Pass in all the messages, and the user, to the chat.ejs file
            // res.render(path.join(__dirname, "front-end", "chat.ejs"), {allResults: allResults, user: req.user})
        }
    })
	
})


app.get("/logout", (req, res) => {
	req.logout();
	res.redirect("/login");
})


// =================================== SOCKET.IO HANDLING ===================================
// Each connection makes a new instance of the socket object
// Within here, we can handle all sorts of events that will be received from the client-side
// (whenver a person connects or interacts with the webpage) 
io.on("connection", socket => {       
    console.log("A wild user appeared! ");

    socket.on("room", (room, username) => {
        socket.join(room);
        console.log(username + " joined room: " + room);
    })

    // This "chat_message" event is custom. We've named it ourself. Check out
    // index.js. Submitting the form triggers
    // a "chat_message" event which we define. This event is a socket event,
    // and is handled here.
    socket.on("chat_message", (authorId, author, msg, room) => {
        // io.emit() emits information to *all* the connected sockets. This is then
        // handled *again* on the client side. (see index.html)
        io.to(room).emit("chat_message", authorId, author, msg);
        // Because socket.io also has this handler on the backend, we can append the new
        // message to our database!!!! Epic.
        db.interact(
            "INSERT INTO messages (authorid, authorname, message, isPrivate) VALUES ($1, $2, $3, FALSE)",
            [authorId, author, msg], () => {}
        );
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