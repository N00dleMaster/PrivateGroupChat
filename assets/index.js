// This is the client-side socket connection we need to establish
const socket = io.connect("http://localhost:8080");

const username = window.prompt("Enter a username:");

const messages = document.getElementById("messages");
const form = document.getElementById('form');
const input = document.getElementById('input');


// ============= DOM POPULATOR ==============
let db = [
    {"author": "NoodleMaster",
     "message": "Hellow world"},
     
    {"author": "NoodleBoi",
    "message": "Did you seriously just misspell the word, 'Hello'?"}
]
console.log(db[0].author);


// ============ EVENT LISTENERS =============
form.addEventListener('submit', function(e) {
    e.preventDefault(); // Prevents the form from reloading page
    if (input.value) {
        // This emits a "chat_message" event, which we define and handle below
        socket.emit('chat_message', input.value, username);
        input.value = '';
    }
});


// ============= SOCKET.IO EVENTS ==================
// See the app.js file for the "chat_message" event
socket.on("chat_message", (msg, author) => {
    createMsg(msg, author);
});


// ============== MISC EVENTS =================
function createMsg(msg,author) {
    // Create new element, append to ul
    const newMsg = document.createElement("li");
    newMsg.innerText = author + ": " + msg;
    messages.appendChild(newMsg);
}