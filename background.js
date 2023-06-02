

let currDate = new Date();
console.log("Atlantis background process loaded at " + currDate.getHours() + ":" + currDate.getMinutes() + ":" + currDate.getSeconds())


function escapeHtml(html) {
    return html.replace(/\\/g, '\\\\')
               .replace(/"/g, '\\"')
}



let modelMap = {};

let socket = new WebSocket('ws://127.0.0.1:3020/');

// Connection opened
socket.addEventListener('open', function (event) {
    console.log('Connection opened to LLM service');
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log('Message from server: ', event.data);
});

// Listen for close event
socket.addEventListener('close', function(event) {
    console.log('LLM service connection closed', event);
});

// Connection error
socket.addEventListener('error', function (event) {
    console.log('Connection error: ', event);
});



chrome.runtime.onMessage.addListener(async function(message, sender, sendResponse) {

    if (message.message === "snapshot" ||
        message.message === "announce") {

        console.log("Background got " + message.message + " " + message.service + " " + message.model)
        console.log(message)

        if (message.data) {
            message.data = escapeHtml(message.data);
        }


        if (message.message === "announce") {
            let models = modelMap[message.service + "." + message.model];
            if (!models) {
                models = modelMap[message.service + "." + message.model] = {};
            }
            models[message.clientId] = message;

            //console.log(modelMap);
        }

        try {

            socket.send(JSON.stringify(message));

        } catch (error) {
            console.log('Error:', error);
        }

    } else {

        console.log("Got unrecognized message");
        console.log(message)

    }



});
