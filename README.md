# Advanced YouTube Transcript Copier

[![Script Version](https://img.shields.io/badge/version-3.1-brightgreen.svg)](https://greasyfork.org/en/scripts/495817-en-advanced-youtube-transcript-copier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Tired of manually copying YouTube transcripts? This script adds a clean "Copy Transcript" button to any video page, letting you copy the entire timestamped text to your clipboard in a single click.

---

### 📥 Installation

1.  **Install a userscript manager:** You need an extension like [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2.  **Install the script**

### ✨ Features

*   **✨ One-Click Simplicity:** Adds a single, easy-to-access "Copy Transcript" button right above the comments section.
*   **📄 Clean, Timestamped Format:** Copies the full transcript with perfectly aligned timestamps (`HH:MM:SS text...`), ready to be pasted anywhere.
*   **🚀 Instant & Reliable:** The button appears instantly on every video.
*   **⚙️ Built for Modern YouTube:** Works perfectly with YouTube's dynamic single-page application design. Navigate between videos seamlessly—the button will always be there when you need it.
*   **🧠 Smart & Non-Intrusive:** The entire process happens in the background. No screen jumps or interruptions to your viewing experience. It also provides clear feedback (Copying... Copied! Not Found...).

### 📋 How to Use

1.  Navigate to any YouTube video that has a transcript.
2.  Click the **"Copy Transcript"** button.
3.  The full, formatted transcript is now in your clipboard!

### 🚀 What's New in v3.1

This version was completely overhauled for reliability on YouTube's modern architecture. The core logic was migrated from a slow `MutationObserver` to YouTube's native `yt-navigate-finish` event, fixing the bug where the button wouldn't appear when navigating between videos. The script is now faster, more efficient, and future-proof.

---

### 🙏 Acknowledgements

Special thanks to **Amir Tehrani**, whose original script provided the foundational logic for this project. This version builds upon that excellent groundwork.
