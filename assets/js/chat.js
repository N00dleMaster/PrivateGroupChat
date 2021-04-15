// This is the client-side socket connection we need to establish
const socket = io.connect("http://localhost:8080");


const messages = document.getElementById("messages");
const form = document.getElementById('form');
const input = document.getElementById('input');

scrollBottom();     // On page load, we want the user to be scrolled to the bottom by default.

// Note: See our chat.ejs file in order to understand where we 
//       got the values for username, and userId.

// ============ EVENT LISTENERS =============
form.addEventListener('submit', function(e) {
    e.preventDefault(); // Prevents the form from reloading page
    if (input.value) {
        // This emits a "chat_message" event, which we define and handle below
        socket.emit('chat_message', userId, username, input.value);
        input.value = '';
    }
});



// ================ SOCKET.IO EVENTS ==================
// See the app.js file for the "chat_message" event
socket.on("chat_message", (authorId, author, msg) => {
    createMsg(msg, author);
    scrollBottom()
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

function scrollBottom() {
    // if(messages.scrollTop + messages.clientHeight === messages.scrollHeight) {
        messages.scrollTop = messages.scrollHeight;
    // }
}