


function uuidv4() {

    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function getId() {

    let clientId = sessionStorage.getItem('clientId');
    if (!clientId) {
        sessionStorage.setItem('clientId', uuidv4());
        clientId = sessionStorage.getItem('clientId');
    }

    return clientId;
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
        let model = pathName.substring(1)

        console.log("Found Poe model " + model);
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
        clientId: getId()
    }

    setInterval(async function() {


        if (window.location.href !== currentUrl) {
            console.log("LLM service scanning " + window.location.href + " " + currentUrl)

            currentUrl = window.location.href;
            //console.log('URL has been changed!');

            if (currService) {
                currService.model = null;
                currService.target = null;
                currService.priorText = null;
                currService.announced = false;
            }
        }

        if (!currService) {
            let clientId = getId();

            currService = {
                clientId,
                model: null,
                target: null,
                priorText: null,
                announced: false
            }

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

                    console.log("LLM target found");

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

                    console.log("LLM target found");

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


    } ,1000)



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