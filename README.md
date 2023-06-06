
# For research purposes only

## Browser Plugin for Chrome / Edge / Brave etc.

Recently a number of users have been noting degraded quality and unexplained discrepancies across providers. This extension lets an external test agent coordinate
browser interactions

To load this extension in your browser, enable developer mode in your browser and then navigate to chrome://extensions or similar and then "load unpacked" from this folder after cloning it from GitHub

For now, this does not activate until the URL is pointing to either ChatGPT or Poe and it is clear what model is being used. For example, the ChatGPT URL will need to be https://chat.openai.com/?model=text-davinci-002-render-sha not just the default

Check browser console and/or the service worker for logs

This will attempt to connect to llmservice on port 3020 over native websockets so you probably want to start that first

