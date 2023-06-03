


function uuidv4() {

    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function getId() {

    let clientId = localStorage.getItem('clientId');
    if (!clientId) {
        localStorage.setItem('clientId', uuidv4());
        clientId = localStorage.getItem('clientId');
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



    let currService = {
        clientId: getId(),
        hostId: await getHostId(),

        model: null,
        target: null,
        priorText: null,
        announced: false

    }

    setInterval(async function() {


        if (window.location.href !== currentUrl) {
            //console.log("LLM service scanning " + window.location.href + " " + currentUrl)

            currentUrl = window.location.href;
            //console.log('URL has been changed!');

            currService.model = null;
            currService.target = null;
            currService.priorText = null;
            currService.announced = false;

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


        if (!currService.announced) {

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


        }

        if (!currService.target) {

            if (currService.service === "poe") {
                let targets = document.querySelectorAll(`div[class^="InfiniteScroll_container"]`);
                //console.log(targets.length + " target(s) found");

                if (targets.length === 1) {

                    currService.target = targets[0]

                    console.log("Content found");

                } else {
                    //console.log("Target not found")
                    return;
                }
            } else if (currService.service === "openai") {
                let targets = document.querySelectorAll(`div[class^="react-scroll-to-bottom--css"]`);
                //console.log(targets.length + " target(s) found");
                //console.log(targets)

                if (targets.length === 2) {

                    currService.target = targets[1]

                    console.log("Content found");

                } else {
                    //console.log("Target not found")
                    return;
                }

            } else {
                return;
            }

        }

        let latest = currService.target.innerText;
        if (currService.priorText != latest) {
            console.log("Sending snapshot")
            try {
                let unused = await chrome.runtime.sendMessage({
                    hostId: currService.hostId,
                    clientId: currService.clientId,
                    service: currService.service,
                    model: currService.model,
                    message: "snapshot",
                    data: latest
                });
            } catch (err) {
                console.log("ERROR: " + err.toString())
            }
            //console.log("got result from background: " + result)
            currService.priorText = latest;
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
            for (let i = 0; i < node.classList.length; i++) {
                if (node.classList[i].startsWith(prefix)) {
                    elementsWithPrefix.push(node);
                    break; // We found a match, no need to check other classes
                }
            }

            // Search child nodes
            for (let i = 0; i < node.childNodes.length; i++) {
                searchChildNodes(node.childNodes[i]);
            }
        }

        searchChildNodes(element);

        return elementsWithPrefix;
    }

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log("Got message from background");
            console.log(request);

            if (currService.service === "poe") {

                let targets = document.querySelectorAll(`div[class^="ChatMessageInputContainer_inputContainer"]`);
                console.log(targets.length + " input target(s) found");

                if (targets.length === 1) {

                    let container = targets[0]

                    console.log("Input widget found");

                    let prompt = container.querySelector(`textarea`);

                    if (prompt) {

                        setNativeValue(prompt, request.data);
                        prompt.dispatchEvent(new Event('input', { bubbles: true }))

                        let buttons = findClassWithPrefix(container, 'ChatMessageSendButton_sendButton');

                        if (buttons.length) {
                            let firstButton = buttons[0];
                            firstButton.click();
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

                /*
                prompt.value = request.data;



                let enclosingForm = prompt.closest('form');

                if (enclosingForm) {
                    // enclosingForm.submit();

                    let ke = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        keyCode: 13,
                        bubbles: true
                    });
                    enclosingForm.dispatchEvent(ke);
                }
                */


                setNativeValue(prompt, request.data);
                prompt.dispatchEvent(new Event('input', { bubbles: true }))

                /*
                {
                    let ke = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        keyCode: 13,
                        bubbles: true
                    });
                    prompt.dispatchEvent(ke);
                }
                */

                let parentElement = prompt.parentElement;
                let firstButton = parentElement.querySelector('button');
                if (firstButton) {
                    /*
                    firstButton.disabled = false;

                    {
                        let ke = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            keyCode: 13,
                            bubbles: true
                        });
                        firstButton.dispatchEvent(ke);
                    }
                    */
                    firstButton.click();

                } else {
                    console.log("Button not found")
                }


                /*
                let targets = document.querySelectorAll(`div[class^="react-scroll-to-bottom--css"]`);
                //console.log(targets.length + " target(s) found");
                //console.log(targets)

                if (targets.length === 2) {

                    currService.target = targets[1]

                    console.log("LLM target found");

                } else {
                    //console.log("Target not found")
                    return;
                }
                */

            } else {


            }

        }
    );

        /*
        const textareas = document.querySelectorAll('textarea[placeholder^="Talk to"]');
        if (textareas.length) {
            prompt = textareas[0];
            if (prompt.placeholder.endsWith("on Poe")) {
                console.log("starting Poe");

                const messages =  document.querySelectorAll(`div[class^='ChatMessage_messageWrapper']`);
                console.log(messages)




                let prior = "";
                let foo = async function() {

                    let latest = main.innerText
                    if (prior != latest) {
                        console.log("Sending snapshot")
                        let result = await chrome.runtime.sendMessage({
                            message:"snapshot",
                            data: latest
                        });
                        //console.log("got result from background: " + result)
                        prior = latest
                    }


                    element.value = result

                    const ke = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        keyCode: 13,
                        bubbles: true
                    });
                    element.dispatchEvent(ke);

                    setTimeout(foo,5000)
                }
                setTimeout(foo,5000)

            }
        }
        */


        // Check for the existence of an element
        /*
        var prompt = document.getElementById('prompt-textarea');
        let main = document.querySelector("main")


        let prior = "";
        let foo = async function() {

            let latest = main.innerText
            if (prior != latest) {
                console.log("Sending snapshot")
                let result = await chrome.runtime.sendMessage({
                    message:"snapshot",
                    data: latest
                });
                //console.log("got result from background: " + result)
                prior = latest
            }


            element.value = result

            const ke = new KeyboardEvent('keydown', {
                key: 'Enter',
                keyCode: 13,
                bubbles: true
            });
            element.dispatchEvent(ke);

            setTimeout(foo,5000)
        }
        setTimeout(foo,5000)
        */
        /*
        prompt.addEventListener('focus', async function(event) {
            console.log('Element has received focus:', event.target);

            let result = await chrome.runtime.sendMessage({
                message:"ready"
            });

         });
         */

});