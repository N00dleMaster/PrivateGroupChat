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
// For sending message
form.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevents the form from reloading page (default behaviour)
    if (input.value) {
        // This emits a "chat_message" event to a certain room, which we define and handle below and on back-end
        socket.emit('chat_message', userId, username, input.value, room);
        input.value = '';
    }
});

document.querySelectorAll(".delete").forEach((btn) => {
    attachDeleteBtnEventListener(btn);
})

// For switching btwn #general and #sensitive channels
general.addEventListener('click', (e) => {
    room = "general";  // Set room to "general"
    // Change background colour of tab; hide the sensitive chat ul
    general.style.backgroundColor = "#0B090A";
    generalMessages.style.display = "inherit";
    // Change background colour of tab; hide general chat ul
    sensitive.style.backgroundColor = "#161A1D";
    sensitiveMessages.style.display = "none";
    // Emit a room change event, handled on back-end
    socket.emit("room", room);
    scrollBottom();
})
sensitive.addEventListener('click', (e) => {
    room = "sensitive"; // set room to "sensitive"
    // Change background colour of tab; hide the sensitive chat ul
    sensitive.style.backgroundColor = "#0B090A";
    sensitiveMessages.style.display = "inherit";
    // Change background colour of tab; hide general chat ul
    general.style.backgroundColor = "#161A1D";
    generalMessages.style.display = "none";
    // Emit a room change event, handled on back-end
    socket.emit("room", room);
    scrollBottom();
})



// ================ SOCKET.IO EVENTS ==================
// See the app.js file for the backend handling of each event
let room = "general"; // This is the room we join on page load.

// On connection, we do this:
socket.on("connect", () => {
    socket.emit("room", room);  // The "Room" event is handled exclusively on the back-end.
})

// On a chat message event, we do this:
socket.on("chat_message", (authorId, author, msgId, msg) => {
    createMsg(msg, msgId, author, room);
    scrollBottom()
});

// On a message deletion event, we do this:
socket.on("delete", (msgId) => {
    const msgs = document.querySelectorAll(".options p");
    // We start from the end of array bcs the message is more likely to be near the start
    for(let i=msgs.length-1; i>=0; i--) {
        if(parseInt(msgs[i].innerText) === msgId) {
            msgs[i].parentElement.parentElement.remove();
        }
    }
})


// ================================== MISC FUNCTIONS ==================================
function createMsg(msg, msgId, author, chat) {
    // Create new element, append to ul
    const newMsg = document.createElement("li");

    const authorTitle = document.createElement("p");
    authorTitle.classList.add("messageAuthor");
    authorTitle.innerText = author;

    const msgContent = document.createElement("p");
    msgContent.classList.add("messageContent");
    msgContent.innerText = msg;

    const options = document.createElement("div");
    options.classList.add("options");
    const info = document.createElement("p");
    info.innerText = msgId;
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "delet";
    deleteBtn.classList.add("delete");
    attachDeleteBtnEventListener(deleteBtn);
    options.appendChild(info);
    options.appendChild(deleteBtn);

    newMsg.appendChild(authorTitle);
    newMsg.appendChild(msgContent);
    newMsg.appendChild(options);

    if(chat == "general") {
        generalMessages.appendChild(newMsg);
    } else {
        sensitiveMessages.appendChild(newMsg);
    }
}

function attachDeleteBtnEventListener(btn) {
    btn.addEventListener("click", () => {
        // The previous sibling of the btn is an invisible <p> with the msg id, necessary for deletion.
        socket.emit("delete", parseInt(btn.previousElementSibling.innerText))
    })
    return btn;
}

function scrollBottom() {
    generalMessages.scrollTop = generalMessages.scrollHeight;
}