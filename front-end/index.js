
const socket = io.connect("http://localhost:8080");

const messages = document.getElementById("messages");
const form = document.getElementById('form');
const input = document.getElementById('input');

form.addEventListener('submit', function(e) {
    e.preventDefault(); // Prevents the form from reloading page
    if (input.value) {
        // This emits a "chat_message" event, which we define and handle
        // in index.js
        socket.emit('chat_message', input.value);
        input.value = '';
    }
});

socket.on("chat_message", (msg) => {
    // Create new element, append to ul
    const newMsg = document.createElement("li");
    newMsg.innerText = msg;
    messages.appendChild(newMsg);
});