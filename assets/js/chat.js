// This is the client-side socket connection we need to establish
const socket = io.connect("http://localhost:8080");

// All our DOM elements
const generalMessages = document.querySelector(".general");
const sensitiveMessages = document.querySelector(".private");

const form = document.getElementById('form');
const input = document.getElementById('input');

const general = document.getElementById("general");
const sensitive = document.getElementById("sensitive");

scrollBottom();     // On page load, we want the user to be scrolled to the bottom by default.



// Note: See our chat.ejs file in order to understand where we 
//       got the values for username, and userId.

// ==================================== EVENT LISTENERS ====================================
form.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevents the form from reloading page (default behaviour)
    if (input.value) {
        // This emits a "chat_message" event to a certain room, which we define and handle below and on back-end
        socket.emit('chat_message', userId, username, input.value, room);
        input.value = '';
    }
});

general.addEventListener('click', (e) => {
    room = "general";  // Set room to "general"
    // Change background colour of tab; hide the sensitive chat ul
    general.style.backgroundColor = "#0B090A";
    generalMessages.style.display = "initial";
    // Change background colour of tab; hide general chat ul
    sensitive.style.backgroundColor = "#161A1D";
    sensitiveMessages.style.display = "none";
    // Emit a room change event, handled on back-end
    socket.emit("room", room);
})
sensitive.addEventListener('click', (e) => {
    room = "sensitive"; // set room to "sensitive"
    // Change background colour of tab; hide the sensitive chat ul
    sensitive.style.backgroundColor = "#0B090A";
    sensitiveMessages.style.display = "initial";
    // Change background colour of tab; hide general chat ul
    general.style.backgroundColor = "#161A1D";
    generalMessages.style.display = "none";
    // Emit a room change event, handled on back-end
    socket.emit("room", room);
})



// ================ SOCKET.IO EVENTS ==================
let room = "general"; // This is the room we join on page load.

// See the app.js file for the backend handling of each event
socket.on("connect", () => {
    socket.emit("room", room);
})
socket.on("chat_message", (authorId, author, msg) => {
    createMsg(msg, author, room);
    scrollBottom()
});


// ================================== MISC FUNCTIONS ==================================
function createMsg(msg, author, chat) {
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

    if(chat == "general") {
        generalMessages.appendChild(newMsg);
    } else {
        sensitiveMessages.appendChild(newMsg);
    }
}

function scrollBottom() {
    generalMessages.scrollTop = generalMessages.scrollHeight;
}