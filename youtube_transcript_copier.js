// ==UserScript==
// @name         [EN] Advanced YouTube Transcript Copier
// @version      3.1
// @description  Works instantly on all videos. Perfectly handles YouTube's navigation (SPA) using modern event detection. Includes spam-click protection for a flawless user experience.
// @author       Amir Tehrani (Optimized by Gemini AI & Charles)
// @match        https://www.youtube.com/*
// @grant        none
// @namespace    https://greasyfork.org/
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- Constants and State Variables ---
    const BUTTON_ID = 'yt-transcript-copy-button-v3-1';
    const STYLE_ID = 'yt-transcript-button-styles-v3-1';
    const INITIAL_TEXT = 'Copy Transcript';
    const COPYING_TEXT = 'Copying...';
    const SUCCESS_TEXT = 'Copied!';
    const NOT_FOUND_TEXT = 'Transcript Not Found';
    const FAILED_TEXT = 'Copy Failed';

    const COLOR_BLUE = 'var(--yt-spec-badge-chip-background, #065fd4)';
    const COLOR_GREEN = 'var(--yt-spec-icon-active-other, #28a745)';
    const COLOR_RED = 'var(--yt-spec-text-link, #dc3545)';

    let copyButton = null;
    let isCopying = false; // State lock to prevent multiple clicks

    /**
     * Waits for an element to be available in the DOM.
     * @param {string} selector The CSS selector of the element to wait for.
     * @param {Element} parent The parent element to search within.
     * @param {number} timeout The time in milliseconds before giving up.
     * @returns {Promise<Element>} A promise that resolves with the found element.
     */
    function waitForElement(selector, parent = document, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const el = parent.querySelector(selector);
            if (el) return resolve(el);

            const observer = new MutationObserver(() => {
                const el = parent.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    clearTimeout(timeoutId);
                    resolve(el);
                }
            });

            const timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`[YT Copier] Timed out waiting for selector: "${selector}"`));
            }, timeout);

            observer.observe(parent, { childList: true, subtree: true });
        });
    }

    /**
     * Handles the copy button click, with spam protection.
     */
    async function handleCopyClick() {
        if (isCopying) {
            console.log("[YT Copier] Copy operation already in progress. Click ignored.");
            return;
        }

        isCopying = true;
        updateButtonState(COPYING_TEXT, COLOR_BLUE);

        const originalScrollY = window.scrollY;

        try {
            // Simulate the clicks needed to display the transcript
            const expanderButton = document.querySelector('#description-inline-expander #expand.ytd-text-inline-expander');
            if (expanderButton) expanderButton.click();

            const showTranscriptButton = await waitForElement('ytd-video-description-transcript-section-renderer button', document, 5000);
            showTranscriptButton.click();

            // Collapse the description to avoid disturbing the user
            const collapserButton = await waitForElement('#description-inline-expander #collapse.ytd-text-inline-expander', document, 2000);
            collapserButton.click();

            const transcriptContainer = await waitForElement('ytd-transcript-renderer #segments-container');
            await copyTranscriptText(transcriptContainer);

        } catch (error) {
            console.error("[YT Copier] Failed during the copy process:", error);
            updateButtonState(NOT_FOUND_TEXT, COLOR_RED);
        } finally {
            // Restore scroll position after a short delay to allow YouTube's UI to settle.
            setTimeout(() => {
                window.scrollTo({ top: originalScrollY, behavior: 'instant' });
            }, 100);

            isCopying = false; // Release the lock, no matter what happens
        }
    }

    /**
     * Extracts the transcript text and copies it to the clipboard.
     * @param {Element} transcriptContainer The element containing the transcript segments.
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
            return (timestampEl && textEl) ? `${timestampEl.innerText.trim()} ${textEl.innerText.trim()}` : null;
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
            console.error("[YT Copier] Error copying to clipboard:", err);
            updateButtonState(FAILED_TEXT, COLOR_RED);
        }
    }

    /**
     * Updates the button's appearance and text.
     * @param {string} text The text to display.
     * @param {string} color The background color of the button.
     */
    function updateButtonState(text, color) {
        if (!copyButton) return;
        copyButton.textContent = text;
        copyButton.style.backgroundColor = color;

        const isFinalState = [SUCCESS_TEXT, NOT_FOUND_TEXT, FAILED_TEXT].includes(text);
        if (isFinalState) {
            setTimeout(() => {
                if (copyButton && !isCopying) { // Only reset if another operation hasn't started
                    copyButton.textContent = INITIAL_TEXT;
                    copyButton.style.backgroundColor = COLOR_BLUE;
                }
            }, 3000);
        }
    }

    /**
     * Creates and inserts the copy button into the page.
     */
    async function createAndInsertButton() {
        if (document.getElementById(BUTTON_ID)) return; // Button already exists

        injectStyles(); // Ensure styles are present

        copyButton = document.createElement('button');
        copyButton.id = BUTTON_ID;
        copyButton.className = 'yt-transcript-button';
        copyButton.textContent = INITIAL_TEXT;
        copyButton.addEventListener('click', handleCopyClick);

        try {
            const commentsSection = await waitForElement('ytd-comments#comments');
            commentsSection.parentNode.insertBefore(copyButton, commentsSection);
        } catch (error) {
            console.error("[YT Copier] Could not find the comments section to insert the button.", error);
        }
    }

    /**
     * Injects the CSS styles needed for the button.
     */
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .yt-transcript-button {
                background-color: ${COLOR_BLUE};
                color: var(--yt-spec-text-primary-inverse, white);
                border: none;
                padding: 10px 18px;
                margin: 0 8px 16px;
                font-family: "Roboto", "Arial", sans-serif;
                font-size: 1.4rem;
                font-weight: 500;
                border-radius: var(--yt-spec-border-radius-2x, 20px);
                cursor: pointer;
                transition: background-color 0.3s ease, transform 0.1s ease, box-shadow 0.2s ease;
                box-shadow: var(--yt-spec-elevation-1, 0 2px 4px rgba(0,0,0,0.2));
            }
            .yt-transcript-button:hover {
                box-shadow: var(--yt-spec-elevation-2, 0 4px 8px rgba(0,0,0,0.3));
                transform: translateY(-1px);
            }
            .yt-transcript-button:active {
                transform: translateY(0);
                box-shadow: var(--yt-spec-elevation-1, 0 2px 4px rgba(0,0,0,0.2));
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Resets the script's state (removes the old button).
     */
    function resetState() {
        const oldButton = document.getElementById(BUTTON_ID);
        if (oldButton) oldButton.remove();
        copyButton = null;
        isCopying = false;
    }

    /**
     * Main entry point. Checks if we are on a video page and injects the button.
     */
    function initialize() {
        resetState(); // Clean up previous state on each navigation

        // The script should only run on video watch pages
        if (window.location.pathname !== '/watch') {
            return;
        }

        console.log("[YT Copier] Initializing on a new video page.");
        createAndInsertButton();
    }


    // --- SPA-Aware Startup Logic ---

    // Listen for YouTube's custom navigation event for perfect reactivity.
    document.addEventListener('yt-navigate-finish', initialize);

    // Handle the initial page load case (direct access or F5).
    if (document.body) {
        initialize();
    } else {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    }

})();
