// popup.js - sends messages to the content script
// Each button maps to a message that content.js listens for

const buttons = [
  { id: "solveAll",       message: "solveAll" },
  { id: "solveAnimation", message: "solveAnimation" },
  { id: "solveMC",        message: "solveMC" },
  { id: "solveSA",        message: "solveSA" },
  { id: "solveDragDrop",  message: "solveDragDrop" },
  { id: "solveClickable", message: "solveClickable" },
  { id: "solveTable",     message: "solveTable" }
];

document.addEventListener("DOMContentLoaded", () => {
  for (const { id, message } of buttons) {
    document.getElementById(id).addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { message });
        }
      });
    });
  }
});
