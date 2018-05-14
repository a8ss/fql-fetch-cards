chrome.browserAction.onClicked.addListener(function (tab) {
  var jsonH_url = chrome.extension.getURL("fql-card-show/index.html");
  chrome.windows.create({url: jsonH_url, type: "popup", width: 1024, height: 768});
})