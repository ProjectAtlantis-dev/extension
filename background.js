

let currDate = new Date();
console.log("Atlantis background process loaded at " + currDate.getHours() + ":" + currDate.getMinutes() + ":" + currDate.getSeconds())


function escapeHtml(html) {
    return html.replace(/\\/g, '\\\\')
               .replace(/"/g, '\\"')
}




let senderMap = {};

let socket;


chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    //console.log(`Tab id: ${tabId} was closed`);

    Object.keys(senderMap).map(function(clientId) {
        let tab = senderMap[clientId];
        if (tabId === tab.id) {
            console.log("Client " + clientId + " was closed")
            try {

                // send 'message'
                let message = {
                    message: 'terminated',
                    clientId
                }
                socket.send(JSON.stringify(message));

            } catch (error) {
                console.log('Error:', error);
            }

        }

    });
});


chrome.runtime.onMessage.addListener(async function(message, sender, sendResponse) {


    //console.log("Background got " + message.message + " " + message.service + " " + message.model)
    //console.log(message)


    senderMap[message.clientId] = sender.tab;


    let getSocket = async function() {
        if (!socket) {
            try {
                socket = new WebSocket('ws://127.0.0.1:3020/');

                // Connection error
                socket.addEventListener('error', function (event) {
                    console.log('Connection error: ', event);
                });

            } catch (err) {
                reject(err.toString())
            }

            let p = new Promise(function(resolve, reject) {

                // Connection opened
                socket.addEventListener('open', function (event) {
                    console.log('Connection opened to LLM service');

                    // Listen for messages from server
                    socket.addEventListener('message', function (event) {
                        console.log('Message from server');
                        let payload = JSON.parse(event.data);
                        console.log(payload)

                        // track by request id ?

                        // send to browser tab
                        let origTab = senderMap[payload.clientId];
                        chrome.tabs.sendMessage(origTab.id, payload);

                    });

                    // Listen for close event
                    socket.addEventListener('close', function(event) {
                        console.log('LLM service connection closed', event);
                        socket = null;
                    });


                    resolve(true);
                });




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
                        delay = 500;
                        resolve(true);
                    } else {
                        // back off and try again
                        console.log('No LLM service connection');

                        if (delay < 10000) {
                            delay *= 2;
                        }
                        setTimeout(trySocket, delay)
                    }
                }

                trySocket();

            });

            return p;

        }
    }

    try {
        await getSocket();
    } catch (err) {
        console.log("ERROR: " + err.toString())
        return;
    }


    if (message.data) {
        message.data = escapeHtml(message.data);
    }

    // try to guess browser
    let clientType = "Chrome";
    if (message.hostId.indexOf("Edg")>= 0) {
        clientType = "Edge"
    } else if (message.hostId.indexOf("Brave")>= 0) {
        clientType = "Brave"
    }
    message.clientType = clientType;



    try {

        if (message.message === "snapshot") {
            console.log("Sending START >>>>>" + message.data + "<<<<< END")
        } else if (message.message === "announce") {
            // this is like a general alive ping
            //console.log("Sending announce " + message.service + " " + message.model)
        } else if (message.message === "ping") {
            // this is like a per request ping
            console.log("Sending ping " + message.requestId)
        } else if (message.message === "done") {
            console.log("Sending done " + message.requestId)
        }

        // send 'message'
        socket.send(JSON.stringify(message));

    } catch (error) {
        console.log('Error:', error);
    }


});
