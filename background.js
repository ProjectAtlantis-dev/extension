

let currDate = new Date();
console.log("Atlantis background process loaded at " + currDate.getHours() + ":" + currDate.getMinutes() + ":" + currDate.getSeconds())


function escapeHtml(html) {
    return html.replace(/\\/g, '\\\\')
               .replace(/"/g, '\\"')
}



let modelMap = {};

let socket;




chrome.runtime.onMessage.addListener(async function(message, sender, sendResponse) {


    console.log("Background got " + message.message + " " + message.service + " " + message.model)
    console.log(message)

    modelMap[message.clientId] = message;

    console.log(modelMap)

    let getSocket = async function() {
        if (!socket) {
            socket = new WebSocket('ws://127.0.0.1:3020/');

            let p = new Promise(function(resolve, reject) {
                // Connection opened
                socket.addEventListener('open', function (event) {
                    console.log('Connection opened to LLM service');
                    resolve(true);
                });
            });

            // Listen for messages
            socket.addEventListener('message', function (event) {
                console.log('Message from server: ', event);
            });

            // Listen for close event
            socket.addEventListener('close', function(event) {
                console.log('LLM service connection closed', event);
                socket = null;
            });

            // Connection error
            socket.addEventListener('error', function (event) {
                console.log('Connection error: ', event);
            });

            return p;
        } else {
            let delay = 500;
            let p = new Promise(function(resolve, reject) {

                let trySocket = function() {
                    if (socket.readyState === WebSocket.OPEN) {
                        if (delay > 500) {
                            console.log('Connected to LLM service');
                        }
                        resolve(true);
                    } else {
                        // back off and try again
                        console.log('No LLM service connection');
                        delay *= 2;
                        setTimeout(trySocket, delay)
                    }
                }

                trySocket();

            });

            return p;

        }
    }

    await getSocket();


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

            // send 'message'
            socket.send(JSON.stringify(message));

        } catch (error) {
            console.log('Error:', error);
        }


    } else {

        console.log("Got unrecognized message");
        console.log(message)

    }



});
