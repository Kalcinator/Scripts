// ==UserScript==
// @name         Advanced YouTube Transcript Copier
// @version      2.7
// @description  MAXIMUM ROBUSTNESS: Prevents multiple clicks (spam-clicks) from causing errors or page jumps. Integrates a state lock for flawless execution. The user experience is now perfect.
// @author       Amir Tehrani (Finalized and hardened by Gemini AI & Charles)
// @match        https://www.youtube.com/watch*
// @grant        none
// @namespace    https://greasyfork.org/
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- Constants and State Variables ---
    const BUTTON_ID = 'yt-transcript-copy-button-v2-7';
    const STYLE_ID = 'yt-transcript-button-styles';
    const INITIAL_TEXT = 'Copy Transcript';
    const COPYING_TEXT = 'Copying...';
    const SUCCESS_TEXT = 'Copied!';
    const NOT_FOUND_TEXT = 'Transcript Not Found';
    const FAILED_TEXT = 'Copy Failed';

    const COLOR_BLUE = 'var(--yt-spec-badge-chip-background, #065fd4)';
    const COLOR_GREEN = 'var(--yt-spec-icon-active-other, #28a745)';
    const COLOR_RED = 'var(--yt-spec-text-link, #dc3545)';

    let pageObserver = null;
    let currentURL = window.location.href;
    let copyButton = null;
    let isCopying = false; // --- STATE LOCK ---

    /**
     * Waits for an element to appear in the DOM.
     */
    function waitForElement(selector, parent = document, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const el = parent.querySelector(selector);
            if (el) return resolve(el);
            const obs = new MutationObserver(() => {
                const el = parent.querySelector(selector);
                if (el) {
                    obs.disconnect();
                    clearTimeout(timeoutId);
                    resolve(el);
                }
            });
            const timeoutId = setTimeout(() => {
                obs.disconnect();
                reject(new Error(`[YT Copier] Timeout exceeded for: ${selector}`));
            }, timeout);
            obs.observe(parent, { childList: true, subtree: true });
        });
    }

    /**
     * Handles the copy logic, now protected against multiple clicks.
     */
    async function handleCopyClick() {
        // --- ANTI-SPAM MECHANISM ---
        if (isCopying) {
            console.log("[YT Copier] Operation already in progress. Click ignored.");
            return; // Ignore clicks if a copy operation is already running.
        }

        isCopying = true; // 1. Lock the state
        updateButtonState(COPYING_TEXT, COLOR_BLUE);

        const originalScrollY = window.scrollY;

        try {
            // Background click logic
            const expanderButton = document.querySelector('#description-inline-expander #expand.ytd-text-inline-expander');
            if (expanderButton) expanderButton.click();

            const showTranscriptButton = await waitForElement('ytd-video-description-transcript-section-renderer button', document, 5000);
            showTranscriptButton.click();

            const collapserButton = await waitForElement('#description-inline-expander #collapse.ytd-text-inline-expander');
            collapserButton.click();

            const transcriptContainer = await waitForElement('ytd-transcript-renderer #segments-container');
            await copyTranscriptText(transcriptContainer);

        } catch (error) {
            console.error("[YT Copier] Process failed:", error);
            updateButtonState(NOT_FOUND_TEXT, COLOR_RED);
        } finally {
            // Restore scroll position, executed after YouTube's actions
            setTimeout(() => {
                window.scrollTo({ top: originalScrollY, behavior: 'instant' });
            }, 0);

            isCopying = false; // 2. Unlock the state, no matter what happens
        }
    }

    /**
     * Extracts and copies the text.
     */
    async function copyTranscriptText(transcriptContainer) {
        const segments = transcriptContainer.querySelectorAll('ytd-transcript-segment-renderer');
        if (segments.length === 0) {
            updateButtonState(NOT_FOUND_TEXT, COLOR_RED);
            return;
        }

        const lines = Array.from(segments).map(segment => {
            const timestampEl = segment.querySelector('.segment-timestamp');
            const textEl = segment.querySelector('.segment-text');
            if (!timestampEl || !textEl) return null;
            return `${timestampEl.innerText.trim()} ${textEl.innerText.trim()}`;
        });

        const transcriptText = lines.filter(Boolean).join('\n');
        if (!transcriptText) {
             updateButtonState(NOT_FOUND_TEXT, COLOR_RED);
             return;
        }

        try {
            await navigator.clipboard.writeText(transcriptText);
            updateButtonState(SUCCESS_TEXT, COLOR_GREEN);
        } catch (err) {
            updateButtonState(FAILED_TEXT, COLOR_RED);
        }
    }

    /**
     * Updates the visual state of the button.
     */
    function updateButtonState(text, color) {
        if (!copyButton) return;
        copyButton.textContent = text;
        copyButton.style.backgroundColor = color;

        // The button reset is only scheduled for final states.
        const isFinalState = [SUCCESS_TEXT, NOT_FOUND_TEXT, FAILED_TEXT].includes(text);
        if (isFinalState) {
            setTimeout(() => {
                // Only reset if another operation has not already started
                if (copyButton && !isCopying) {
                    copyButton.textContent = INITIAL_TEXT;
                    copyButton.style.backgroundColor = COLOR_BLUE;
                }
            }, 3000);
        }
    }

    // --- Initialization Functions (unchanged) ---

    async function createAndInsertButton() {
        if (document.getElementById(BUTTON_ID)) return;
        copyButton = document.createElement('button');
        copyButton.id = BUTTON_ID;
        copyButton.className = 'yt-transcript-button';
        copyButton.textContent = INITIAL_TEXT;
        copyButton.addEventListener('click', handleCopyClick);
        injectStyles();
        try {
            const commentsSection = await waitForElement('ytd-comments#comments');
            commentsSection.parentNode.insertBefore(copyButton, commentsSection);
        } catch (error) {
            console.error("[YT Copier] Could not insert the button.", error);
        }
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .yt-transcript-button {
                background-color: ${COLOR_BLUE}; color: var(--yt-spec-text-primary-inverse, white);
                border: none; padding: 10px 18px; margin: 0 8px 16px;
                font-family: "Roboto", "Arial", sans-serif; font-size: 1.4rem; font-weight: 500;
                border-radius: var(--yt-spec-border-radius-2x, 20px); cursor: pointer;
                transition: background-color 0.3s ease, transform 0.1s ease, box-shadow 0.2s ease;
                box-shadow: var(--yt-spec-elevation-1, 0 2px 4px rgba(0,0,0,0.2));
            }
            .yt-transcript-button:hover {
                box-shadow: var(--yt-spec-elevation-2, 0 4px 8px rgba(0,0,0,0.3));
                transform: translateY(-1px);
            }
            .yt-transcript-button:active { transform: translateY(0); }
        `;
        document.head.appendChild(style);
    }

    function resetState() {
        if (pageObserver) pageObserver.disconnect();
        pageObserver = null;
        isCopying = false; // Reset the lock
        const oldButton = document.getElementById(BUTTON_ID);
        if (oldButton) oldButton.remove();
        copyButton = null;
    }

    function startProcess() {
        resetState();
        createAndInsertButton();
        pageObserver = new MutationObserver(() => {
            if (window.location.href !== currentURL) {
                currentURL = window.location.href;
                startProcess();
            }
        });
        pageObserver.observe(document.body, { childList: true, subtree: true });
    }

    startProcess();

})();
