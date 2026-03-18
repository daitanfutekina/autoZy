// AutoZy Content Script - Fixed & Updated
// Handles: Animations, Multiple Choice (MQR), Short Answer

console.info("AutoZy Loaded");

// ============================================================
// UTILITIES
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Dispatch a proper input event so React/zyBooks recognizes the value change
function setInputValue(element, value) {
  // Use the native setter to bypass React's synthetic event system
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set || Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else {
    element.value = value;
  }

  // Fire events that React listens for
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// ============================================================
// ANIMATIONS
// ============================================================

function solveAnimation() {
  console.log("[AutoZy] Starting animation solver...");

  // Enable 2x speed checkboxes
  const speedChecks = document.querySelectorAll('.zb-checkbox input');
  for (const check of speedChecks) {
    if (!check.checked) {
      check.click();
    }
  }

  // Also try the aria-label approach for 2x buttons
  const doubleSpeedButtons = document.querySelectorAll('[aria-label="2x speed"]');
  for (const btn of doubleSpeedButtons) {
    btn.click();
  }

  // Click all start buttons
  setTimeout(() => {
    const startButtons = document.querySelectorAll('button.start-button, .start-button');
    for (const btn of startButtons) {
      btn.click();
    }
    console.log(`[AutoZy] Clicked ${startButtons.length} start buttons`);
  }, 500);

  // Keep pressing play until all animations are done
  const playInterval = setInterval(() => {
    const startButtons = document.querySelectorAll('button.start-button, .start-button');
    const playButtons = document.querySelectorAll('button[aria-label="Play"], .play-button');
    const pauseButtons = document.querySelectorAll('button[aria-label="Pause"]');

    // Click any start buttons that appeared (multi-part animations)
    for (const btn of startButtons) {
      btn.click();
    }

    // Click play buttons
    for (const btn of playButtons) {
      btn.click();
    }

    // If nothing left to click, we're done
    if (startButtons.length + playButtons.length + pauseButtons.length === 0) {
      console.log("[AutoZy] All animations completed");
      clearInterval(playInterval);
    }
  }, 1500);

  // Safety: stop after 5 minutes
  setTimeout(() => clearInterval(playInterval), 300000);
}

// ============================================================
// MULTIPLE CHOICE (MQR) - batch approach with retry
// ============================================================

async function solveMultipleChoice() {
  console.log("[AutoZy] Starting multiple choice solver...");

  const questions = document.getElementsByClassName('question-choices');
  console.log(`[AutoZy] Found ${questions.length} MC question groups`);

  if (questions.length === 0) return;

  // Pass 1: click the first option in every question
  for (const question of questions) {
    const inputs = question.getElementsByTagName('input');
    if (inputs.length > 0) {
      inputs[0].click();
    }
  }
  console.log("[AutoZy] Clicked first option for all questions");

  // Now iteratively fix wrong answers
  // Each pass: find all visible "incorrect" markers, go to their parent,
  // find the question-choices inside, click the next option
  let optionNumber = 1;
  const maxOptions = 10; // safety cap

  while (optionNumber < maxOptions) {
    await sleep(800);

    const incorrects = document.querySelectorAll('div.zb-explanation.incorrect');
    if (incorrects.length === 0) {
      console.log("[AutoZy] All MC questions answered correctly");
      break;
    }

    console.log(`[AutoZy] ${incorrects.length} incorrect, trying option ${optionNumber + 1}`);

    for (const incorrect of incorrects) {
      // The incorrect div and the question-choices are siblings
      // under the same parent
      const parent = incorrect.parentElement;
      if (!parent) continue;

      const questionChoices = parent.getElementsByClassName('question-choices');
      for (const qc of questionChoices) {
        const inputs = qc.getElementsByTagName('input');
        if (inputs.length > optionNumber) {
          inputs[optionNumber].click();
        }
      }
    }

    optionNumber++;
  }

  console.log("[AutoZy] Multiple choice solver complete");
}

// ============================================================
// SHORT ANSWER - click show answer, copy to input, submit
// ============================================================

async function solveShortAnswer() {
  console.log("[AutoZy] Starting short answer solver...");

  // Step 1: Click all "Show answer" buttons
  // Each button needs two clicks: first shows the confirm prompt, second confirms
  const showAnswerButtons = document.querySelectorAll('button.show-answer-button');
  console.log(`[AutoZy] Found ${showAnswerButtons.length} show-answer buttons`);

  for (const btn of showAnswerButtons) {
    btn.click();
    await sleep(400);
    btn.click();
    await sleep(400);
  }

  // Wait for all forfeited answers to render
  await sleep(1200);

  // Step 2: Find each forfeited answer and fill the input WITHIN THE SAME question
  //
  // zyBooks DOM per short-answer question looks roughly like:
  //   <div class="question-set-question"> (or similar per-question wrapper)
  //     <input class="zb-input" .../>
  //     <div class="has-explanation forfeit">
  //       <span class="forfeit-answer">the answer text</span>
  //     </div>
  //   </div>
  //
  // KEY FIX: we walk up from each forfeit div to its IMMEDIATE parent,
  // NOT to the whole activity container. That way querySelector finds
  // the input for THIS question only, not the first input in the block.

  const forfeitDivs = document.querySelectorAll('div.has-explanation.forfeit');
  let filled = 0;

  if (forfeitDivs.length > 0) {
    console.log(`[AutoZy] Found ${forfeitDivs.length} forfeited answer divs`);

    for (const div of forfeitDivs) {
      const answerEl = div.querySelector('.forfeit-answer');
      if (!answerEl) continue;

      const answerText = answerEl.innerText.trim();
      if (!answerText) continue;

      // Walk up ONE level at a time until we find a parent that contains
      // both this forfeit div AND an input field. Stop at 5 levels max.
      let parent = div.parentElement;
      let inputField = null;

      for (let depth = 0; depth < 5 && parent; depth++) {
        inputField = parent.querySelector('input.zb-input, textarea.zb-text-area, input[type="text"]');
        if (inputField) break;
        parent = parent.parentElement;
      }

      if (inputField) {
        setInputValue(inputField, answerText);
        filled++;
        console.log(`[AutoZy] Filled SA #${filled}: "${answerText.substring(0, 50)}"`);
        await sleep(200);
      } else {
        console.warn(`[AutoZy] Could not find input for answer: "${answerText.substring(0, 50)}"`);
      }
    }
  }

  // Fallback: if the forfeit-div approach found nothing, try index-based matching
  if (filled === 0) {
    console.log("[AutoZy] Forfeit-div approach found 0, trying index-based fallback");
    const answers = document.querySelectorAll('.forfeit-answer');
    const textBoxes = document.querySelectorAll('input.zb-input, textarea.zb-text-area');

    console.log(`[AutoZy] Fallback: ${answers.length} answers, ${textBoxes.length} inputs`);

    for (let i = 0; i < answers.length && i < textBoxes.length; i++) {
      const answerText = answers[i].innerText.trim();
      if (answerText) {
        setInputValue(textBoxes[i], answerText);
        filled++;
        console.log(`[AutoZy] Fallback filled #${i + 1}: "${answerText.substring(0, 50)}"`);
        await sleep(200);
      }
    }
  }

  // Step 3: Click all check/submit buttons
  await sleep(600);
  const checkButtons = document.querySelectorAll('button.check-button, button.submit-button');
  for (const btn of checkButtons) {
    btn.click();
    console.log("[AutoZy] Clicked check button");
    await sleep(400);
  }

  console.log(`[AutoZy] Short answer solver complete. Filled ${filled} answers.`);
}

// ============================================================
// SOLVE ALL
// ============================================================

async function solveAll() {
  solveAnimation();
  await sleep(1000);
  await solveMultipleChoice();
  await sleep(500);
  await solveShortAnswer();
  console.log("[AutoZy] Solve All complete");
}

// ============================================================
// MESSAGE LISTENER - receives commands from popup
// ============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[AutoZy] Received message:", request.message);

  switch (request.message) {
    case "solveAll":
      solveAll();
      break;
    case "solveAnimation":
      solveAnimation();
      break;
    case "solveMC":
      solveMultipleChoice();
      break;
    case "solveSA":
      solveShortAnswer();
      break;
    default:
      console.log("[AutoZy] Unknown message:", request.message);
  }

  // Return true to indicate we might send a response asynchronously
  return true;
});
