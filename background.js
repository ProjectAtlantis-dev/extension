

let currDate = new Date();
console.log("Atlantis background process loaded at " + currDate.getHours() + ":" + currDate.getMinutes() + ":" + currDate.getSeconds())


function escapeHtml(html) {
    return html.replace(/\\/g, '\\\\')
               .replace(/"/g, '\\"')
}

let LLM_SERVICE="http://127.0.0.1:3010/";


chrome.runtime.onMessage.addListener(async function(message, sender, sendResponse) {


    if (message.message === "snapshot" ||
        message.message === "announce") {

        console.log("Background got " + message.message)
        console.log(message)

        if (message.data) {
            message.data = escapeHtml(message.data);
        }


        try {

            // http://127.0.0.1:3010/llm_announce
            let url = LLM_SERVICE + "llm_" + message.message;
            console.log("Sending to " + url);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json(); // this parses the JSON response
            //console.log(data);
        } catch (error) {
            console.log('Error:', error);
        }

    } else {

        console.log("Got unrecognized message");
        console.log(message)

    }



});
