// AutoZy Content Script - v2.0.0
// Handles: Animations, Multiple Choice (MQR), Short Answer,
//          Drag & Drop Matching, Clickable Questions, Table/Custom Interactions

console.info("AutoZy v2.0 Loaded");

// ============================================================
// UTILITIES
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Dispatch a proper input event so React/zyBooks recognizes the value change
function setInputValue(element, value) {
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

    for (const btn of startButtons) {
      btn.click();
    }

    for (const btn of playButtons) {
      btn.click();
    }

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

  // Iteratively fix wrong answers
  let optionNumber = 1;
  const maxOptions = 10;

  while (optionNumber < maxOptions) {
    await sleep(800);

    const incorrects = document.querySelectorAll('div.zb-explanation.incorrect');
    if (incorrects.length === 0) {
      console.log("[AutoZy] All MC questions answered correctly");
      break;
    }

    console.log(`[AutoZy] ${incorrects.length} incorrect, trying option ${optionNumber + 1}`);

    for (const incorrect of incorrects) {
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

  // Step 1: Click all "Show answer" buttons (two clicks each: show + confirm)
  const showAnswerButtons = document.querySelectorAll('button.show-answer-button');
  console.log(`[AutoZy] Found ${showAnswerButtons.length} show-answer buttons`);

  for (const btn of showAnswerButtons) {
    btn.click();
    await sleep(400);
    btn.click();
    await sleep(400);
  }

  await sleep(1200);

  // Step 2: Find each forfeited answer and fill the input WITHIN THE SAME question
  const forfeitDivs = document.querySelectorAll('div.has-explanation.forfeit');
  let filled = 0;

  if (forfeitDivs.length > 0) {
    console.log(`[AutoZy] Found ${forfeitDivs.length} forfeited answer divs`);

    for (const div of forfeitDivs) {
      const answerEl = div.querySelector('.forfeit-answer');
      if (!answerEl) continue;

      const answerText = answerEl.innerText.trim();
      if (!answerText) continue;

      // Walk up until we find a parent that contains both this div AND an input
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

  // Fallback: index-based matching
  if (filled === 0) {
    console.log("[AutoZy] Forfeit-div approach found 0, trying index-based fallback");
    const answers = document.querySelectorAll('.forfeit-answer');
    const textBoxes = document.querySelectorAll('input.zb-input, textarea.zb-text-area');

    for (let i = 0; i < answers.length && i < textBoxes.length; i++) {
      const answerText = answers[i].innerText.trim();
      if (answerText) {
        setInputValue(textBoxes[i], answerText);
        filled++;
        await sleep(200);
      }
    }
  }

  // Step 3: Click all check/submit buttons
  await sleep(600);
  const checkButtons = document.querySelectorAll('button.check-button, button.submit-button');
  for (const btn of checkButtons) {
    btn.click();
    await sleep(400);
  }

  console.log(`[AutoZy] Short answer solver complete. Filled ${filled} answers.`);
}

// ============================================================
// DRAG & DROP MATCHING
// ============================================================
//
// zyBooks drag-and-drop DOM structure:
//   <div class="definition-match-payload" content_resource_id="...">
//     <ul class="term-bank">
//       <li class="unselected-term">
//         <div class="draggable-object"><span>Option text</span></div>
//       </li>
//     </ul>
//     <div class="definition-row">
//       <div class="definition">Definition text</div>
//       <div class="term-bucket"></div>                  <- drop zone
//       <div class="definition-match-explanation"></div> <- correct/incorrect
//     </div>
//     ... more definition-rows ...
//     <button class="reset-button">Reset</button>
//   </div>
//
// Strategy: for each unfilled target, try dragging each available
// option from the bank. Check explanation div for feedback.
// If incorrect, option bounces back. If correct, move on.

function simulateDragDrop(dragElement, dropTarget) {
  const dt = new DataTransfer();

  const dragStart = new DragEvent('dragstart', {
    bubbles: true, cancelable: true, dataTransfer: dt
  });
  const dragOver = new DragEvent('dragover', {
    bubbles: true, cancelable: true, dataTransfer: dt
  });
  const drop = new DragEvent('drop', {
    bubbles: true, cancelable: true, dataTransfer: dt
  });
  const dragEnd = new DragEvent('dragend', {
    bubbles: true, cancelable: true, dataTransfer: dt
  });

  dragElement.dispatchEvent(dragStart);
  dropTarget.dispatchEvent(dragOver);
  dropTarget.dispatchEvent(drop);
  dragElement.dispatchEvent(dragEnd);
}

async function waitForFeedback(row, timeout = 1500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const explanation = row.querySelector('.definition-match-explanation');
    if (explanation) {
      if (explanation.classList.contains('correct')) return 'correct';
      if (explanation.classList.contains('incorrect')) return 'incorrect';
    }
    await sleep(150);
  }
  return 'timeout';
}

async function solveDragDrop() {
  console.log("[AutoZy] Starting drag & drop solver...");

  const containers = document.querySelectorAll('div.definition-match-payload');
  if (containers.length === 0) {
    console.log("[AutoZy] No drag & drop questions found");
    return;
  }

  console.log(`[AutoZy] Found ${containers.length} drag & drop question(s)`);

  for (const container of containers) {
    const allRows = Array.from(container.querySelectorAll('.definition-row'));
    const completedRows = new Set();

    // Check which rows are already correct
    for (const row of allRows) {
      const expl = row.querySelector('.definition-match-explanation');
      if (expl && expl.classList.contains('correct')) {
        completedRows.add(row);
      }
    }

    if (completedRows.size === allRows.length) {
      console.log("[AutoZy] D&D question already complete, skipping");
      continue;
    }

    // If some are partially filled but wrong, reset for a clean run
    const populatedBuckets = container.querySelectorAll('.term-bucket.populated');
    if (populatedBuckets.length > 0 && completedRows.size < allRows.length) {
      const resetBtn = container.querySelector('button.reset-button');
      if (resetBtn) {
        console.log("[AutoZy] Resetting D&D for clean attempt...");
        resetBtn.click();
        await sleep(600);
        completedRows.clear();
      }
    }

    // For each unfilled row, brute-force options from the bank
    for (const row of allRows) {
      if (completedRows.has(row)) continue;

      const dropZone = row.querySelector('.term-bucket');
      if (!dropZone) continue;

      let matched = false;

      // Re-query each time because options move in/out of the bank
      const getAvailableOptions = () =>
        Array.from(container.querySelectorAll('.term-bank li.unselected-term div.draggable-object'));

      const options = getAvailableOptions();
      for (const option of options) {
        if (matched) break;

        const optionText = (option.querySelector('span')?.textContent || option.textContent).trim();
        console.log(`[AutoZy] D&D: trying "${optionText.substring(0, 30)}"...`);

        simulateDragDrop(option, dropZone);
        await sleep(500);

        const result = await waitForFeedback(row);

        if (result === 'correct') {
          console.log(`[AutoZy] D&D: correct match!`);
          completedRows.add(row);
          matched = true;
          await sleep(300);
        } else {
          await sleep(400);
        }
      }

      // If bank options didn't work, try swapping from populated (wrong) buckets
      if (!matched) {
        const populatedOptions = Array.from(
          container.querySelectorAll('.term-bucket.populated div.draggable-object')
        ).filter(opt => {
          const parentRow = opt.closest('.definition-row');
          return parentRow && !completedRows.has(parentRow);
        });

        for (const option of populatedOptions) {
          if (matched) break;

          simulateDragDrop(option, dropZone);
          await sleep(500);

          const result = await waitForFeedback(row);
          if (result === 'correct') {
            console.log(`[AutoZy] D&D: correct match (from swap)!`);
            completedRows.add(row);
            matched = true;
            await sleep(300);
          } else {
            await sleep(400);
          }
        }
      }

      if (!matched) {
        console.warn(`[AutoZy] D&D: could not find match for a target row`);
      }
    }

    console.log(`[AutoZy] D&D question done: ${completedRows.size}/${allRows.length} matched`);
  }

  console.log("[AutoZy] Drag & drop solver complete");
}

// ============================================================
// CLICKABLE QUESTIONS (detect-the-answer / click-the-right-element)
// ============================================================
//
// zyBooks DOM structure:
//   <div class="detect-answer-content-resource">
//     <div class="detect-answer-question">
//       <div class="question-choices">
//         <button class="zb-button grey unclicked">Option A</button>
//         ...
//       </div>
//       <div class="zb-chevron question-chevron">...</div>
//     </div>
//   </div>
//
// Strategy: for each question, try clicking each unclicked button.
// Check the chevron for completion after each click. These use
// regular buttons instead of radio inputs.

async function solveClickable() {
  console.log("[AutoZy] Starting clickable question solver...");

  const containers = document.querySelectorAll('div.detect-answer-content-resource');
  if (containers.length === 0) {
    console.log("[AutoZy] No clickable questions found");
    return;
  }

  console.log(`[AutoZy] Found ${containers.length} clickable activity container(s)`);

  for (const container of containers) {
    const questions = container.querySelectorAll('.detect-answer-question');

    for (const question of questions) {
      // Check if already completed
      const chevron = question.querySelector('.zb-chevron.question-chevron');
      if (chevron && (chevron.classList.contains('filled') || chevron.classList.contains('orange'))) {
        continue;
      }

      // Get all unclicked buttons for this question
      const buttons = Array.from(
        question.querySelectorAll('button.zb-button.grey.unclicked, button.zb-button.unclicked')
      );

      if (buttons.length === 0) {
        // Might be a different variant with clickable text elements
        const altButtons = Array.from(
          question.querySelectorAll('.clickable-text, .clickable-element, [role="button"]:not(.disabled)')
        );
        for (const btn of altButtons) {
          btn.click();
          await sleep(500);
        }
        continue;
      }

      console.log(`[AutoZy] Clickable: ${buttons.length} options to try`);

      for (const btn of buttons) {
        btn.click();
        await sleep(600);

        // Check if it's now correct
        const updatedChevron = question.querySelector('.zb-chevron.question-chevron');
        if (updatedChevron && (updatedChevron.classList.contains('filled') || updatedChevron.classList.contains('orange'))) {
          console.log("[AutoZy] Clickable: correct answer found");
          break;
        }
      }
    }
  }

  console.log("[AutoZy] Clickable question solver complete");
}

// ============================================================
// TABLE / CUSTOM INTERACTIVE ACTIVITIES
// ============================================================
//
// Covers several zyBooks table-style activities:
// 1. Truth tables / fill-in tables with <select> dropdowns
// 2. "Render webpage" buttons (HTML courses)
// 3. "Run" buttons (code output activities)
// 4. Table text inputs with show-answer patterns
//
// Strategy: find selects, try each option until correct.
// Click render/run buttons. Handle remaining show-answer patterns.

async function solveTableActivities() {
  console.log("[AutoZy] Starting table/custom activity solver...");

  let actionsPerformed = 0;

  // --- Handle "Render Webpage" buttons ---
  const renderButtons = document.querySelectorAll('button.render-webpage, button.zb-button.render-webpage');
  for (const btn of renderButtons) {
    btn.click();
    actionsPerformed++;
    console.log("[AutoZy] Clicked render webpage button");
    await sleep(300);
  }

  // --- Handle table-based select/dropdown activities ---
  const selects = document.querySelectorAll(
    '.interactive-activity-container select, .custom-content-resource select, table select'
  );

  if (selects.length > 0) {
    console.log(`[AutoZy] Found ${selects.length} dropdown(s) in table activities`);

    for (const select of selects) {
      // Skip if already answered correctly
      const parentRow = select.closest('tr') || select.closest('.definition-row');
      if (parentRow && parentRow.classList.contains('correct')) continue;

      const options = Array.from(select.options);
      if (options.length <= 1) continue;

      // Try each option
      for (let i = 1; i < options.length; i++) {
        select.selectedIndex = i;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(400);

        // Click check button if one exists nearby
        const checkBtn = (parentRow || select.parentElement)?.querySelector(
          'button.check-button, button.submit-button'
        );
        if (checkBtn) {
          checkBtn.click();
          await sleep(500);
        }

        // See if it's now correct
        const expl = (parentRow || select.parentElement)?.querySelector(
          '.zb-explanation, .explanation'
        );
        if (expl && expl.classList.contains('correct')) {
          console.log(`[AutoZy] Table dropdown correct: option "${options[i].text}"`);
          actionsPerformed++;
          break;
        }

        if (parentRow && parentRow.classList.contains('correct')) {
          actionsPerformed++;
          break;
        }
      }
    }
  }

  // --- Handle table text inputs (fill-in-the-blank inside tables) ---
  const tableInputs = document.querySelectorAll(
    'table input.zb-input, table input[type="text"], .custom-content-resource input.zb-input'
  );

  if (tableInputs.length > 0) {
    console.log(`[AutoZy] Found ${tableInputs.length} table text input(s)`);

    for (const input of tableInputs) {
      if (input.value && input.value.trim() !== '') continue;

      let parent = input.closest('.question-set-question') ||
                   input.closest('tr') ||
                   input.closest('.interactive-activity-container');

      if (parent) {
        const showBtn = parent.querySelector('button.show-answer-button');
        if (showBtn) {
          showBtn.click();
          await sleep(400);
          showBtn.click();
          await sleep(600);

          const answer = parent.querySelector('.forfeit-answer');
          if (answer) {
            setInputValue(input, answer.innerText.trim());
            actionsPerformed++;
            await sleep(200);
          }
        }
      }
    }

    // Click any remaining check buttons
    await sleep(400);
    const tableCheckBtns = document.querySelectorAll(
      'table button.check-button, .custom-content-resource button.check-button'
    );
    for (const btn of tableCheckBtns) {
      btn.click();
      await sleep(300);
    }
  }

  // --- Handle generic "Run" buttons (code-output activities) ---
  const runButtons = document.querySelectorAll('button.run-button.zb-button');
  for (const btn of runButtons) {
    btn.click();
    actionsPerformed++;
    console.log("[AutoZy] Clicked run button");
    await sleep(300);
  }

  console.log(`[AutoZy] Table/custom activity solver complete. ${actionsPerformed} actions.`);
}

// ============================================================
// SOLVE ALL
// ============================================================

async function solveAll() {
  console.log("[AutoZy] === SOLVE ALL START ===");

  solveAnimation();           // runs on its own interval
  await sleep(1000);
  await solveMultipleChoice();
  await sleep(500);
  await solveShortAnswer();
  await sleep(500);
  await solveDragDrop();
  await sleep(500);
  await solveClickable();
  await sleep(500);
  await solveTableActivities();

  console.log("[AutoZy] === SOLVE ALL COMPLETE ===");
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
    case "solveDragDrop":
      solveDragDrop();
      break;
    case "solveClickable":
      solveClickable();
      break;
    case "solveTable":
      solveTableActivities();
      break;
    default:
      console.log("[AutoZy] Unknown message:", request.message);
  }

  return true;
});
