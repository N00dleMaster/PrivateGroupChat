// This is the client-side socket connection we need to establish
const socket = io.connect("http://localhost:8080");

const messages = document.getElementById("messages");
const form = document.getElementById('form');
const input = document.getElementById('input');


// ============= DOM POPULATOR ==============
// We get the variable "dataBase" from the 
// <script> tags in our index.ejs. Very hack-y
for(let i=0; i<dataBase.length; i++) {
    createMsg(dataBase[i].message, dataBase[i].author);
}


// ============ EVENT LISTENERS =============
form.addEventListener('submit', function(e) {
    e.preventDefault(); // Prevents the form from reloading page
    if (input.value) {
        // This emits a "chat_message" event, which we define and handle below
        socket.emit('chat_message', input.value, username);
        input.value = '';
    }
});

// temporary asking of a username
let username = window.prompt("Enter a username:");
username = (username == "") ? "Unnamed Bum-Bum" : username;

// ============= SOCKET.IO EVENTS ==================
// See the app.js file for the "chat_message" event
socket.on("chat_message", (msg, author) => {
    createMsg(msg, author);
});


// ============== MISC EVENTS =================
function createMsg(msg,author) {
    // Create new element, append to ul
    const newMsg = document.createElement("li");

    const authorTitle = document.createElement("p");
    authorTitle.classList.add("messageAuthor");
    authorTitle.innerText = author;

    const msgContent = document.createElement("p");
    msgContent.classList.add("messageContent");
    msgContent.innerText = msg;

    newMsg.appendChild(authorTitle);
    newMsg.appendChild(msgContent);
    messages.appendChild(newMsg);
}