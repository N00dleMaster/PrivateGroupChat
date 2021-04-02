
const app = require("express")();           // Require express to serve our application
const http = require("http").Server(app);   // Require http, and pass express instance to it.
const io = require("socket.io")(http);      // Require socket.io, pass http server to it
                                            //   --> Socket.io works by being attached onto an http server instance

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
})


// Each connection makes a new instance of the socket object
io.on("connection", socket => {       
    // Within here, we can handle all sorts of events that will be received from the client-side
    // (whenver a person connects or interacts with the webpage) 
    console.log("A wild user appeared! ");

    // This "chat_message" event is custom. We've named it ourself. Check out
    // index.html and go down to the script tag. Submitting the form triggers
    // a "chat_message" event which we define. This event is a socket event,
    // and is handled here.
    socket.on("chat_message", (msg) => {
        // io.emit() emits information to *all* the connected sockets. This is then
        // handled *again* on the client side. (see index.html)
        io.emit("chat_message", msg);
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