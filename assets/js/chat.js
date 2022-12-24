// This is the client-side socket connection we need to establish
const socket = io.connect();

// All our DOM elements
const messages = document.querySelector('.messages');
const form = document.getElementById('form');
const input = document.getElementById('input');

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



// ==================================== SOCKET.IO EVENTS ====================================
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
            msgs[i].parentElement.parentElement.parentElement.remove();
        }
    }
})


// ================================== MISC FUNCTIONS ==================================
// authorId, author, res.rows[0]._id, msg
function createMsg(msg, msgId, author, chat) {
    // Create new element, append to ul
    const newMsg = document.createElement("li");

    const img = document.createElement("img");
    img.src = pfp;
    img.alt = "pfp";
    img.classList.add("pfp")

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("messageDiv");

    const authorTitle = document.createElement("p");
    authorTitle.classList.add("messageAuthor");
    authorTitle.innerText = author;
    authorTitle.style.color = colour;
    const msgContent = document.createElement("p");
    msgContent.classList.add("messageContent");
    msgContent.innerText = msg;

    messageDiv.appendChild(authorTitle);
    messageDiv.appendChild(msgContent);

    const options = document.createElement("div");
    options.classList.add("options");
    const info = document.createElement("p");
    info.innerText = msgId;
    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "<i class='fas fa-trash-alt'></i>";
    deleteBtn.classList.add("delete");
    attachDeleteBtnEventListener(deleteBtn);
    options.appendChild(info);
    options.appendChild(deleteBtn);
    
    newMsg.appendChild(img);
    newMsg.appendChild(messageDiv);
    messageDiv.appendChild(options);

    messages.appendChild(newMsg);
}

function attachDeleteBtnEventListener(btn) {
    btn.addEventListener("click", () => {
        // The previous sibling of the btn is an invisible <p> with the msg id, necessary for deletion.
        socket.emit("delete", parseInt(btn.previousElementSibling.innerText))
    })
    return btn;
}

function scrollBottom() {
    messages.scrollTop = messages.scrollHeight;
}