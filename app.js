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


// =================================== CLEANING THE DB EVERY DAY/WEEK ===================================
const initialDate = new Date();         // A date to start us off
let prevDay = initialDate.getDay();     // A day to start us off
setInterval(() => {
    const newDate = new Date();                             // Create date obj everytime it runs
    let day = newDate.getDay();                             // get the day
    let time = newDate.getHours() + newDate.getMinutes();   // Get hrs and minutes
    if(day != prevDay) {                                    // If the day has changed, delete "sensitive" convo 
        db.deleteConversation("sensitive");
        prevDay = day;
    }
    if(day == 0 && time == "0000") {                         // If it's a new week, delete the "general" convo
        db.deleteConversation("general");
    }
}, 60000)                                   // This func. runs every minute



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
            } else if(res.length > 0) {
                console.log("Got user!")
                user = res[0];
                bcrypt.compare(password, user.password, (err, wasCorrect) => {
                    if(err) {
                        console.log(err);
                    } else if (wasCorrect) {
                        return done(null, {id: user._id});
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
))

// Serializing the user into a session (giving a cookie to browser)
passport.serializeUser(function(user, done){
    console.log("serialize user is executing")
    // We only give the browser the user's id, so when the cookie 
    // is "deserialized" we can use the id to repopulate the req.user
    done(null, user.id);
})

// Deserializing is used on every subsequent request *after* the initial login
passport.deserializeUser(function(id, done){
    db.interact('SELECT _id, username, pfp, colour FROM users WHERE _id = $1', [parseInt(id)], (err, res) => {
        if(err) {
          return done(err)
        }
        return done(null, res[0])
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
    bcrypt.hash(req.body.password, parseInt(process.env.SALT_ROUNDS), (hashErr, hash) => {
        if(hashErr) {
            console.log("Unable to hash password: " + hashErr)
        } else {
            db.addUser(req.body.username, hash, req.body.pfp, req.body.colour, (success) => {
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



// Here we redirect the user to the actual room they are supposed to be in
app.get("/app", (req, res) => {
	if(!req.user) {
		res.redirect("/login");
	} else {
        res.redirect("/app/rooms/1");
    }
})



// THIS IS THE ACTUAL APP
app.get("/app/rooms/:id", async (req, res) => {
    if(req.user == undefined) {
        res.redirect("/login");
        return;
    }

    // First, we'll get all the rooms the user has associated with their account.
    const user_rooms = await db.getRooms(req.user._id); // custom method in our dbmethods file.

    // Then, we'll check if the user is in the room they are trying to access. If not, redirect.
    // room "1" is accessible by everyone; this is the global chat.
    let user_in_room = false;
    for(let i = 0; i < user_rooms.length; i++) {
        if(user_rooms[i]._id == req.params.id) {
            user_in_room = true;
            break;
        }
    }
    if(!user_in_room && req.params.id != 1) {
        res.redirect("/app/rooms/1");
    }

    // Query our db for all messages, and then pass this into our index.ejs file as a JSON obj.
    db.interact("SELECT users.pfp, users.colour, users.username, messages.authorid, messages._id, messages.message FROM users JOIN messages ON users._id=messages.authorid WHERE room_id=$1;",
    [req.params.id], (err, dbRes) => {
        res.render(path.join(__dirname, "front-end", "chat.ejs"), 
            {msgs: dbRes, rooms: user_rooms, room: req.params.id, user: req.user});
    })
})



// User settings, where you can do stuff
app.get("/users/:id", (req, res) => {
    if(!req.user) {
        res.redirect("/login");   
    } else if(req.user._id != req.params.id){
        res.redirect("/app");
    } else {
        res.render(path.join(__dirname, "front-end", "settings.ejs"), {user: req.user});
    }
})
app.post("/users/:id", (req, res) => {
    db.interact("UPDATE users SET username=$1, pfp=$2, colour=$3 WHERE _id=$4", 
        [req.body.username, req.body.pfp, req.body.colour, req.user._id], (err, res) => {});
    res.redirect("/app");
})



// Allows you to create a new room
app.get("/app/newroom", (req, res) => {
    if(!req.user) {
        res.redirect("/login");
    }
    res.render(path.join(__dirname, "front-end", "newroom.ejs"), {user: req.user});
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

    // This event is for changing rooms
    socket.on("room", (room) => {
        console.log("new room joined: " + room);    
        socket.join(room);
    })

    // This "chat_message" event is custom. We've named it ourself. Check out
    // index.js. Submitting the form triggers
    // a "chat_message" event which we define. This event is a socket event,
    // and is handled here.
    socket.on("chat_message", (authorId, author, msg, room) => {
        // Because socket.io also has this handler on the backend, we can append the new
        // message to our database!!!! Epic.
        db.interact(
            "INSERT INTO messages (authorid, authorname, message, room_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [authorId, author, msg, room], (err, res) => {
                if(err) {
                    console.log(err);
                } else {
                    // io.emit() emits information to *all* the connected sockets. This is then
                    // handled *again* on the client side. (see index.html)
                    io.to(room).emit("chat_message", authorId, author, res[0]._id, msg);
                }
            }
        );
    });

    socket.on("delete", (msgId) => {
        db.interact("DELETE FROM messages WHERE _id = $1 RETURNING *", [msgId], (err, res) => {
            console.log("id is: " + msgId);
            if(err) {console.log(err)}
            else{console.log(res.rowCount)}
        })
        io.emit("delete", msgId);
    })

    // The disconnect event is built into socket
    socket.on("disconnect", () => {  
        console.log("A COMRADE HAS LEFT US! :(");
    })
});


// Initializing the server on localhost for now.
http.listen(process.env.PORT || 8080, () => {
    console.log("Listening on port 8080");
}); 