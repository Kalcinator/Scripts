// ==UserScript==
// @name         YouTube Transcript Copier (Elegant & Robust)
// @version      2.3
// @description  Injects a stylish and robust button to copy video transcripts, discreetly placed above the comments section. Handles YouTube's modern SPA navigation and always copies timestamps.
// @author       Amir Tehrani (Updated and refined by Charles & Gemini AI)
// @match        https://www.youtube.com/watch*
// @grant        none
// @namespace    https://github.com/
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  // --- State Variables ---
  // These variables hold the script's state throughout its lifecycle.
  let observer = null; // The MutationObserver instance that watches for page changes.
  let currentURL = window.location.href; // The current page URL, used to detect navigation.
  let copyButton = null; // The DOM element for the copy button.
  let buttonTextNode = null; // The button's text node for easy updates.

  /**
   * A robust utility to wait for an element to appear in the DOM.
   * Uses a MutationObserver for optimal performance, avoiding `setInterval`.
   * @param {string} selector - The CSS selector of the element to find.
   * @param {Element} [parent=document] - The parent element to search within. Defaults to the entire document.
   * @param {number} [timeout=15000] - The timeout in milliseconds before giving up.
   * @returns {Promise<Element>} A promise that resolves with the found element or is rejected on timeout.
   */
  function waitForElement(selector, parent = document, timeout = 15000) {
    return new Promise((resolve, reject) => {
      // Check if the element already exists.
      const el = parent.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }

      // Create an observer to watch for DOM additions.
      const observer = new MutationObserver(() => {
        const el = parent.querySelector(selector);
        if (el) {
          observer.disconnect(); // Stop observing once the element is found.
          clearTimeout(timeoutId); // Cancel the timeout timer.
          resolve(el);
        }
      });

      // Set a fallback timer to prevent infinite waiting.
      const timeoutId = setTimeout(() => {
        observer.disconnect();
        console.error(`Timeout waiting for element: ${selector}`);
        reject(new Error(`Element not found: ${selector}`));
      }, timeout);

      // Start observing the parent element.
      observer.observe(parent, {
        childList: true, // Watch for direct children additions/removals.
        subtree: true, // Extend the watch to the entire descendant tree.
      });
    });
  }

  /**
   * Creates and inserts the "Transcript" button discreetly before the comments section.
   */
  async function createAndInsertButton() {
    if (document.getElementById("yt-transcript-copy-button")) return;

    copyButton = document.createElement("button");
    copyButton.id = "yt-transcript-copy-button";
    copyButton.className = "yt-transcript-button";

    // Add a bottom margin for better visual separation.
    copyButton.style.marginBottom = "16px";

    const buttonText = "Transcript"; // Custom button text
    buttonTextNode = document.createTextNode(buttonText);
    copyButton.setAttribute("aria-label", "Copy Transcript");
    copyButton.appendChild(buttonTextNode);

    copyButton.addEventListener("click", handleCopyClick);
    injectStyles();

    try {
      // Target the comments section itself.
      const commentsSection = await waitForElement("ytd-comments#comments");

      // Insert our button right BEFORE the comments section.
      commentsSection.parentNode.insertBefore(copyButton, commentsSection);
    } catch (error) {
      console.error(
        "Could not find the comments section to insert the button.",
        error
      );
    }
  }

  /**
   * Handles the main logic when the copy button is clicked.
   * The function is async to gracefully handle waiting for elements.
   */
  async function handleCopyClick() {
    updateButtonState("Copying...", "rgba(0, 123, 255, 0.8)");

    try {
      // Step 1: Expand the description box to reveal the "Show transcript" button.
      const descriptionExpander = document.querySelector(
        "#description-inline-expander #expand"
      );
      if (descriptionExpander) {
        descriptionExpander.click();
      }

      // Step 2: Wait for the "Show transcript" button to appear and click it.
      const showTranscriptButton = await waitForElement(
        "ytd-button-renderer.ytd-video-description-transcript-section-renderer button"
      );
      showTranscriptButton.click();

      // Step 3: Wait for the transcript panel to be rendered in the DOM.
      const transcriptPanel = await waitForElement("ytd-transcript-renderer");

      // Step 4: Extract and copy the transcript text.
      copyTranscriptText(transcriptPanel);
    } catch (error) {
      console.error("Failed to process transcript:", error);
      updateButtonState("Transcript Not Found", "rgba(220, 53, 69, 0.8)");
    }
  }

  /**
   * Extracts text from the transcript panel (always with timestamps)
   * and copies it to the clipboard.
   * @param {Element} transcriptPanel - The main transcript container element.
   */
  function copyTranscriptText(transcriptPanel) {
    let transcriptText = "";
    const segments = transcriptPanel.querySelectorAll(
      "ytd-transcript-segment-renderer"
    );

    if (segments.length === 0) {
      updateButtonState("No Text Found", "rgba(220, 53, 69, 0.8)");
      return;
    }

    // The logic is simplified to only handle the timestamped case.
    segments.forEach((segment) => {
      const timestamp = segment
        .querySelector(".ytd-transcript-segment-renderer")
        .innerText.trim();
      const text = segment
        .querySelector("yt-formatted-string")
        .innerText.trim();
      transcriptText += `${timestamp} ${text}\n`; // Format: "HH:MM:SS Line of text"
    });

    // Use the modern and secure Clipboard API.
    navigator.clipboard
      .writeText(transcriptText.trim())
      .then(() => {
        updateButtonState("Copied!", "rgba(40, 167, 69, 0.9)");
      })
      .catch((err) => {
        console.error("Failed to copy transcript:", err);
        updateButtonState("Copy Failed", "rgba(220, 53, 69, 0.8)");
      });
  }

  /**
   * Updates the button's appearance (text and color) to provide visual feedback to the user.
   * @param {string} text - The text to display on the button.
   * @param {string} color - The CSS background color for the button.
   */
  function updateButtonState(text, color) {
    if (!copyButton || !buttonTextNode) return;

    buttonTextNode.textContent = text;
    copyButton.style.backgroundColor = color;

    // If it's a final state (success or error), schedule a reset.
    if (
      text === "Copied!" ||
      text.includes("Not Found") ||
      text.includes("Failed") ||
      text.includes("No Text")
    ) {
      setTimeout(() => {
        buttonTextNode.textContent = "Transcript"; // Reset to the default text.
        copyButton.style.backgroundColor = "rgba(0, 123, 255, 0.8)";
      }, 2500); // Leave the message visible for 2.5 seconds.
    }
  }

  /**
   * Injects a <style> tag into the document's <head> for custom button styling.
   */
  function injectStyles() {
    if (document.getElementById("yt-transcript-button-styles")) return;
    const style = document.createElement("style");
    style.id = "yt-transcript-button-styles";
    style.textContent = `
            .yt-transcript-button {
                background-color: rgba(0, 123, 255, 0.8); border: none; color: white;
                padding: 10px 18px; text-align: center; text-decoration: none;
                display: inline-flex; align-items: center; font-size: 14px;
                margin: 0; cursor: pointer; border-radius: 20px;
                transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                font-family: 'Roboto', 'Arial', sans-serif; font-weight: 500;
            }
            .yt-transcript-button:hover {
                background-color: rgba(0, 90, 180, 0.9);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                transform: translateY(-1px);
            }
            .yt-transcript-button:focus { outline: none; box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.3); }
            .yt-transcript-button:active { transform: translateY(1px); }
        `;
    document.head.appendChild(style);
  }

  // --- SPA Navigation Handling ---
  // This section is crucial for the script to work when the user
  // navigates between videos without a full page reload.

  /**
   * Resets the script's state. Removes the old button and the observer.
   */
  function resetState() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    const oldButton = document.getElementById("yt-transcript-copy-button");
    if (oldButton) {
      oldButton.remove();
    }
    copyButton = null;
    buttonTextNode = null;
  }

  /**
   * The main process that initializes the script on a page
   * and sets up the observer for future navigations.
   */
  function startProcess() {
    // Clean up any previous instance to prevent duplicates.
    if (observer) observer.disconnect();

    // Start the button creation process on the current page.
    createAndInsertButton();

    // Create a new observer to detect URL changes.
    observer = new MutationObserver(() => {
      if (window.location.href !== currentURL) {
        currentURL = window.location.href; // Update the reference URL.
        resetState(); // Clean up the old page state.
        startProcess(); // Restart the process on the new page.
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --- Initial Start ---
  startProcess();
})();
