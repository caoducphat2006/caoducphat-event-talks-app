# BQ Pulse &mdash; BigQuery Release Notes Explorer

BQ Pulse is a modern, high-fidelity web application built with **Python Flask** and **Vanilla HTML/CSS/JS**. It fetches the latest Google Cloud BigQuery release notes, parses them into categorized sub-updates, and provides a polished interface to search, filter, and share updates on X (Twitter).

---

## 🌟 Key Features

- **Automated Parser**: Fetches Google's official BigQuery Atom release feed and splits combined daily announcements into distinct cards (e.g. *Features*, *Announcements*, *Issues*, *Deprecations*).
- **Dynamic Search & Filtering**: Instant, real-time client-side search by text, date, or category with modern CSS fade/slide transitions.
- **Smart Tweet Composer**: Open a slide-in modal to draft and preview your X (Twitter) post, including a live character counter with URL shortening calculations (all links count as 23 characters on X).
- **Copy-to-Clipboard**: Quick one-click copy options for both formatted updates and Tweet drafts.
- **Robust Cache & Offline Fallbacks**: Caches feed data in-memory for 10 minutes to reduce API latency. If a live fetch fails, it gracefully falls back to the cache with a user warning toast.
- **Rich Dark Aesthetics**: Implements a deep space glassmorphism design system using Google Fonts (Outfit & Plus Jakarta Sans) and interactive micro-animations.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher.
- A modern web browser.

### Installation & Run

1. **Activate the environment**:
   If you are using **Windows PowerShell**:
   ```powershell
   .venv\Scripts\Activate.ps1
   ```
   *Note: A pre-configured virtual environment `.venv` with Flask is already installed in this workspace.*

2. **Install dependencies** (if setting up on a new environment):
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server**:
   ```bash
   python app.py
   ```

4. **Access the application**:
   Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

---

## 📂 Project Structure

- [app.py](file:///D:/5-Day%20AI%20Agents%20Intensive%20Vibe%20Coding%20Course%20With%20Google/agy-cli-projects/app.py) &mdash; Flask server and Atom XML parser.
- [templates/index.html](file:///D:/5-Day%20AI%20Agents%20Intensive%20Vibe%20Coding%20Course%20With%20Google/agy-cli-projects/templates/index.html) &mdash; Single-page app HTML mockup structure.
- [static/css/style.css](file:///D:/5-Day%20AI%20Agents%20Intensive%20Vibe%20Coding%20Course%20With%20Google/agy-cli-projects/static/css/style.css) &mdash; Premium dark theme, animations, and typography styling.
- [static/js/app.js](file:///D:/5-Day%20AI%20Agents%20Intensive%20Vibe%20Coding%20Course%20With%20Google/agy-cli-projects/static/js/app.js) &mdash; Core app controller, search, filtering, and Tweet composer interface.
