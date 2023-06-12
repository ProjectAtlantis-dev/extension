


function uuidv4() {

    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function getId() {

    let clientId = sessionStorage.getItem('atlantis.clientId');
    if (!clientId) {
        sessionStorage.setItem('atlantis.clientId', uuidv4());
        clientId = sessionStorage.getItem('atlantis.clientId');
    }

    return clientId;
}

async function getHostId() {

    let braveTag = "";
    if ((navigator.brave && await navigator.brave.isBrave() || false)) {
        braveTag = " Brave";
    }

    return navigator.userAgent + braveTag;

}




window.addEventListener("load", async function(event) {


    let currentUrl = "";


    let currDate = new Date();
    console.log("Atlantis browser extension loaded at " + currDate.getHours() + ":" + currDate.getMinutes() + ":" + currDate.getSeconds())
    console.log("Client id is " + getId());

    let findService = function(currService) {
        let currentUrl = window.location.href;

        if (currentUrl.startsWith("https://poe.com")) {
            currService.service = "poe";
        }

        if (currentUrl.startsWith("https://chat.openai.com")) {
            currService.service = "openai";
        }

        return currService.service;
    }



    let findPoeModel = function() {
        let pathName = decodeURIComponent(window.location.pathname);
        let model = pathName.substring(1).trim();

        if (model.length) {
            console.log("Found Poe model [" + model +"]");
        }
        return model;
    }

    function getQueryParams() {
        var queryString = window.location.search.substring(1);
        var params = {};
        var queries = queryString.split("&");

        queries.forEach(function(query) {
            var pair = query.split('=');
            var key = decodeURIComponent(pair[0]);
            var value = decodeURIComponent(pair[1] || "");
            params[key] = value;
        });

        //console.log(params)
        return params;
    }


    let findOpenAIModel = function() {

        let queryParams = getQueryParams()
        let model
        if (Reflect.has(queryParams, "model")) {
            model = queryParams["model"]
            console.log("Found OpenAI model " + model)
        }

        return model;
    }

    let findModel = function(currService) {
        let currentUrl = window.location.href;
        if (currentUrl.startsWith("https://poe.com")) {
            currService.model = findPoeModel();
        }

        if (currentUrl.startsWith("https://chat.openai.com")) {
            currService.model = findOpenAIModel();
        }

        return currService.model;
    }

    let getOutputContent = function() {
        if (!outputTarget) {
            return "";
        }

        let tablesFound = false;
        let lastDiv = outputTarget.querySelector('div[class^="ChatMessagesView_messagePair"]:last-child');
        // see if tables
        /*
        if (lastDiv) {
            let tables = lastDiv.querySelectorAll('table');
            if (tables.length) {
                tablesFound = true;
                let buffer = tables[0].outerHTML;

                console.log("Found table")
                console.log(buffer);

                try {
                    let unused = await chrome.runtime.sendMessage({
                        hostId: currService.hostId,
                        clientId: currService.clientId,
                        service: currService.service,
                        model: currService.model,

                        message: "table",

                        requestId: currService.requestId,
                        prompt: currService.prompt,

                        data: sendBuffer
                    });

                    priorBufferSent = sendBuffer;
                } catch (err) {
                    console.log("ERROR: " + err.toString())
                }


                return buffer;
            }
        }
        */

        // get last child of output target
        return outputTarget.innerText;
    }




    let currService = {
        clientId: getId(),
        hostId: await getHostId(),
        model: null,

        requestId: null,
        prompt: null
    }


    let outputTarget

    let baselineSnap = "";
    let baselineSnapDate = new Date();

    let priorBufferSent = "";
    let priorSnap = "";
    let priorSentSnap = "";

    let doneFound = false;

    setInterval(async function() {
        //console.log("Running page scan")

        if (window.location.href !== currentUrl) {
            //console.log("LLM service scanning " + window.location.href + " " + currentUrl)

            currentUrl = window.location.href;
            //console.log('URL has been changed!');

            currService.model = null;
            currService.requestId = null;
        }

        if (!currService.hostId) {
            currService.hostId = await getHostId()
        }

        if (!currService.clientId) {
            currService.clientId = getId()
        }


        if (!currService.service) {

            let service = findService(currService);
            if (!service) {
                //console.log("No LLM service found on page")
                return;
            }
        }

        if (!currService.model) {
            let model = findModel(currService);
            if(!model) {
                //console.log("No LLM model found on page")
                return;
            }
        }




        let getInputTarget = function() {

            //console.log("Lacking input target")

            if (currService.service === "poe") {

                let targets = document.querySelectorAll(`div[class^="ChatMessageInputContainer_inputContainer"]`);
                //console.log(targets.length + " input target(s) found");

                if (targets.length === 1) {

                    let container = targets[0]

                    let prompt = container.querySelector(`textarea`);

                    if (prompt) {

                        let buttons = findClassWithPrefix(container, 'ChatMessageSendButton_sendButton');

                        if (buttons.length) {
                            let firstButton = buttons[0];

                            if (firstButton) {
                                //console.log("Input target found");
                                return prompt;
                            }

                        } else {
                            console.log("No button(s) found")
                            return;
                        }
                    } else {
                        console.log("No prompt found")
                        return;
                    }

                } else {
                    //console.log("Input target not found")
                    return;
                }


            } else if (currService.service === "openai") {

                let prompt = document.getElementById('prompt-textarea');

                if (!prompt) {
                    //console.log("Unable to find input target");
                    return;
                }

                let parentElement = prompt.parentElement;
                let firstButton = parentElement.querySelector('button');
                if (firstButton) {

                    //console.log("Input target found");
                    return prompt;

                } else {
                    console.log("Button not found")
                    return;
                }

            } else {
                return;
            }


        }
        let inputTarget = getInputTarget()
        if (!inputTarget) {
            // can briefly disappear while response is generating
            return;
        }


        // if we get here we can at least announce/heartbeat
        //console.log("Sending announce")
        try {
            let announceMsg = {
                hostId: currService.hostId,
                clientId: currService.clientId,
                service: currService.service,
                model: currService.model,
                message: "announce"
            }
            //console.log(announceMsg)
            let unused = await chrome.runtime.sendMessage(announceMsg);
            currService.announced = true;
        } catch (err) {
            console.log(err.toString())
            return;
        }


        let getOutputTarget = function() {

            //console.log("Lacking output target")

            if (currService.service === "poe") {
                let targets = document.querySelectorAll(`div[class^="InfiniteScroll_container"]`);
                //console.log(targets.length + " target(s) found");

                if (targets.length === 1) {

                    //console.log("Output content found");

                    return targets[0];

                } else {
                    //console.log("Output content not found")
                    return;

                }
            } else if (currService.service === "openai") {
                let targets = document.querySelectorAll(`div[class^="react-scroll-to-bottom--css"]`);
                //console.log(targets.length + " target(s) found");
                //console.log(targets)

                if (targets.length === 2) {

                    //console.log("Output content found");
                    return targets[1];

                } else {
                    console.log("Outut content target not found")
                    return;
                }

            } else {
                // no service found
                return;
            }

        }
        outputTarget = getOutputTarget();
        if (!outputTarget) {
            // can briefly disappear while response is generating
            return;
        }



        // if we get here we can send snapshot
        let snap = getOutputContent();
        console.log("snap: " + snap)
        if (currService.service === "poe") {

            // we don't want the feedback buttons or suggested replies
            feedback = snap.lastIndexOf("Share\nLike\nDislike");
            if (feedback) {
                snap = snap.substring(0, feedback-1);
            }
        }
        let snapDate = new Date();

        if (snap != baselineSnap) {
            // update baseline
            baselineSnap = snap;
            baselineSnapDate = snapDate;



            if (currService.requestId) {
                try {
                    let unused = await chrome.runtime.sendMessage({
                        hostId: currService.hostId,
                        clientId: currService.clientId,
                        service: currService.service,
                        model: currService.model,

                        message: "ping",

                        requestId: currService.requestId
                    });

                } catch (err) {
                    console.log("ERROR: " + err.toString())
                }
            }


        } else {

            // no change since baseline; we are potentially idle

            let elapsed = (snapDate - baselineSnapDate)/1000;



            if (!doneFound && elapsed < 4) {
                console.log("IDLE: " + elapsed);
                // do nothing
            } else {


                let buffer = snap;


                if (buffer.length && (buffer != priorBufferSent)) {

                    // make sure we don't send anything prior to the prompt
                    let sendBuffer = buffer;
                    let promptIdx = buffer.lastIndexOf(currService.prompt);
                    if (promptIdx >= 0) {
                        sendBuffer = buffer.substring(promptIdx);
                    }

                    console.log("Sending snapshot: START >>>>" + sendBuffer + "<<<< END")
                    try {
                        let unused = await chrome.runtime.sendMessage({
                            hostId: currService.hostId,
                            clientId: currService.clientId,
                            service: currService.service,
                            model: currService.model,

                            message: "snapshot",

                            requestId: currService.requestId,
                            prompt: currService.prompt,

                            data: sendBuffer
                        });

                        priorBufferSent = sendBuffer;
                    } catch (err) {
                        console.log("ERROR: " + err.toString())
                    }
                } else {
                    if (buffer.length) {
                        console.log("buffer same as already sent")
                        console.log("buffer: " + buffer)
                        console.log("prior: " + priorBufferSent)
                    }
                }

                if (doneFound) {
                    doneFound = false;

                    try {
                        let unused = await chrome.runtime.sendMessage({
                            hostId: currService.hostId,
                            clientId: currService.clientId,
                            service: currService.service,
                            model: currService.model,

                            message: "done",

                            requestId: currService.requestId,
                            prompt: currService.prompt

                        });

                    } catch (err) {
                        console.log("ERROR: " + err.toString())
                    }
                }

            }

        }


    } ,1000);

    function setNativeValue(element, value) {
        const { set: valueSetter } = Object.getOwnPropertyDescriptor(element, 'value') || {}
        const prototype = Object.getPrototypeOf(element)
        const { set: prototypeValueSetter } = Object.getOwnPropertyDescriptor(prototype, 'value') || {}

        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value)
        } else if (valueSetter) {
            valueSetter.call(element, value)
        } else {
            throw new Error('The given element does not have a value setter')
        }
    }

    function findClassWithPrefix(element, prefix) {
        let elementsWithPrefix = [];

        function searchChildNodes(node) {
            // Check each class in the class list
            if (!node.classList) {
                return;
            }

            for (let i = 0; i < node.classList.length; i++) {
                if (node.classList[i].startsWith(prefix)) {
                    elementsWithPrefix.push(node);
                    break; // We found a match, no need to check other classes
                }
            }

            // Search child nodes
            for (let i = 0; i < node.children.length; i++) {
                searchChildNodes(node.children[i]);
            }
        }

        searchChildNodes(element);

        return elementsWithPrefix;
    }


    // openai
    let findDone = function() {
        let tick = async function() {

            console.log("Attempting to find done")
            if (currService.service === "openai") {

                let divs = document.querySelectorAll('div');
                for (let i = 0; i < divs.length; i++) {
                    let tc = divs[i].textContent;
                    if (tc.indexOf("Regenerate response")>=0) {
                        // found
                        console.log("FOUND DONE")
                        doneFound = true;
                        return;

                    }
                }
            } else if (currService.service === "poe") {

                let targets = document.querySelectorAll(`section[class^="ChatMessageFeedbackButtons_feedbackButtonsContainer"]`);
                if (targets.length === 1) {
                    console.log("FOUND DONE")
                    doneFound = true;
                    return;
                }

            } else {
                return;
            }

            // if not found do tick again
            setTimeout(tick, 500);

        }

        setTimeout(tick, 500);
    }


    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log("Got message from background");
            console.log(request);

            currService.requestId = request.requestId;

            if (currService.service === "poe") {

                let targets = document.querySelectorAll(`div[class^="ChatMessageInputContainer_inputContainer"]`);
                //console.log(targets.length + " input target(s) found");

                if (targets.length === 1) {

                    let container = targets[0]

                    console.log("Input widget found");

                    let prompt = container.querySelector(`textarea`);

                    if (prompt) {

                        // reset baseline
                        if (outputTarget) {
                            baselineSnap = getOutputContent();
                        } else {
                            baselineSnap = "";
                        }
                        baselineSnapDate = new Date();

                        setNativeValue(prompt, request.data);
                        prompt.dispatchEvent(new Event('input', { bubbles: true }))

                        let buttons = findClassWithPrefix(container, 'ChatMessageSendButton_sendButton');

                        currService.prompt = request.data;

                        if (buttons.length) {
                            let firstButton = buttons[0];
                            firstButton.click();
                            doneFound = false;
                            findDone();
                        } else {
                            console.log("No button(s) found")
                            console.log(container)
                        }
                    } else {
                        console.log("No prompt found")
                    }

                } else {
                    console.log("Input widget not found")
                    return;
                }


            } else if (currService.service === "openai") {

                let prompt = document.getElementById('prompt-textarea');

                if (!prompt) {
                    console.log("Unable to find input widget");
                    return;
                }


                // reset baseline
                if (outputTarget) {
                    baselineSnap = getOutputContent();
                } else {
                    baselineSnap = "";
                }
                baselineSnapDate = new Date();

                setNativeValue(prompt, request.data);
                prompt.dispatchEvent(new Event('input', { bubbles: true }))

                let parentElement = prompt.parentElement;
                let firstButton = parentElement.querySelector('button');
                if (firstButton) {
                    firstButton.click();
                    doneFound = false;
                    findDone();
                } else {
                    console.log("Button not found")
                }


            } else {


            }

        }
    );

});