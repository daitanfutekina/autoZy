// popup.js - Manifest V3 compatible

function sendMessage(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { message: msg });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('solveAll').addEventListener('click', () => sendMessage('solveAll'));
  document.getElementById('solveAnimation').addEventListener('click', () => sendMessage('solveAnimation'));
  document.getElementById('solveMC').addEventListener('click', () => sendMessage('solveMC'));
  document.getElementById('solveSA').addEventListener('click', () => sendMessage('solveSA'));
});
