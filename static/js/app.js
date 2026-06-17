document.addEventListener('DOMContentLoaded', () => {
    // State management
    let allUpdates = [];
    let currentFilter = 'all';
    let searchQuery = '';
    
    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const retryBtn = document.getElementById('retry-btn');
    
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    
    const typeFilters = document.getElementById('type-filters');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const tweetWarning = document.getElementById('tweet-warning');
    const closeModalBtn = document.getElementById('close-modal');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    
    // Toast Notification
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');

    // Load initial data
    fetchReleaseNotes(false);

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search input handler (live search)
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery.length > 0 ? 'flex' : 'none';
        applyFiltersAndRender();
    });
    
    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        applyFiltersAndRender();
    });

    // Filter pills handler
    typeFilters.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Remove active class from all pills
        typeFilters.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        // Add to clicked
        pill.classList.add('active');
        
        currentFilter = pill.dataset.type;
        applyFiltersAndRender();
    });

    // Close Modal Events
    closeModalBtn.addEventListener('click', hideTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideTweetModal();
    });
    
    // Textarea character count and validation
    tweetTextarea.addEventListener('input', updateCharCount);

    // Copy to clipboard from Modal
    copyTextBtn.addEventListener('click', () => {
        copyTextToClipboard(tweetTextarea.value, "Tweet text copied!");
    });

    // Submit Tweet to X
    submitTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        hideTweetModal();
        showToast("Opening X/Twitter composer...");
    });

    // Fetch releases API
    async function fetchReleaseNotes(forceRefresh = false) {
        setLoading(true);
        try {
            const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Show warnings if cached data is used on failure
            if (data.warning) {
                showToast(data.warning, true);
            } else if (forceRefresh) {
                showToast("Release notes refreshed successfully!");
            }
            
            // Flatten updates for advanced filtering
            flattenUpdates(data.releases);
            applyFiltersAndRender();
            
        } catch (err) {
            console.error("Fetch error:", err);
            errorMessage.textContent = err.message || "Failed to connect to backend server.";
            setErrorState(true);
        } finally {
            setLoading(false);
        }
    }

    // Flatten nested API structure to list of updates
    function flattenUpdates(releases) {
        allUpdates = [];
        releases.forEach(release => {
            if (release.updates && release.updates.length > 0) {
                release.updates.forEach(update => {
                    allUpdates.push({
                        date: release.date,
                        link: release.link,
                        type: update.type || 'General',
                        html: update.html,
                        text: update.text
                    });
                });
            } else {
                // If there are no structured sub-updates, represent the entry as a General update
                allUpdates.push({
                    date: release.date,
                    link: release.link,
                    type: 'General',
                    html: `<p>Check the release notes for full details.</p>`,
                    text: 'Release notes update.'
                });
            }
        });
    }

    // Apply Filter and Search query
    function applyFiltersAndRender() {
        let filtered = allUpdates;
        
        // Apply type filter
        if (currentFilter !== 'all') {
            filtered = filtered.filter(update => update.type.toLowerCase() === currentFilter.toLowerCase());
        }
        
        // Apply search query
        if (searchQuery) {
            filtered = filtered.filter(update => {
                const textMatch = update.text.toLowerCase().includes(searchQuery);
                const typeMatch = update.type.toLowerCase().includes(searchQuery);
                const dateMatch = update.date.toLowerCase().includes(searchQuery);
                return textMatch || typeMatch || dateMatch;
            });
        }
        
        renderFeed(filtered);
    }

    // Group filtered updates by Date and render
    function renderFeed(updates) {
        feedContainer.innerHTML = '';
        
        if (updates.length === 0) {
            emptyState.style.display = 'flex';
            feedContainer.style.display = 'none';
            return;
        }
        
        emptyState.style.display = 'none';
        feedContainer.style.display = 'flex';
        
        // Group by Date
        const grouped = {};
        updates.forEach(update => {
            if (!grouped[update.date]) {
                grouped[update.date] = [];
            }
            grouped[update.date].push(update);
        });
        
        // Render Grouped entries
        Object.keys(grouped).forEach(date => {
            const dayBlock = document.createElement('div');
            dayBlock.className = 'day-block';
            
            // Header for the date
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.innerHTML = `
                <div class="day-date">${date}</div>
                <div class="day-line"></div>
            `;
            dayBlock.appendChild(dayHeader);
            
            // Container for updates on this date
            const updatesContainer = document.createElement('div');
            updatesContainer.className = 'day-updates';
            
            grouped[date].forEach(update => {
                const card = document.createElement('article');
                card.className = 'update-card';
                
                // Color tags configuration
                const typeClass = update.type.toLowerCase();
                card.style.setProperty('--tag-color', `var(--color-${typeClass}, var(--color-general))`);
                card.style.setProperty('--tag-bg', `var(--color-${typeClass}-bg, var(--color-general-bg))`);
                
                card.innerHTML = `
                    <div class="card-header">
                        <span class="update-tag">${update.type}</span>
                        <div class="card-actions">
                            <button class="card-btn btn-copy" title="Copy update text">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                            <button class="card-btn btn-tweet-hover btn-tweet" title="Tweet this update">
                                <i class="fa-brands fa-x-twitter"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-content">
                        ${update.html}
                    </div>
                `;
                
                // Add event listeners to card buttons
                const copyBtn = card.querySelector('.btn-copy');
                copyBtn.addEventListener('click', () => {
                    const formattedText = `BigQuery Release (${update.date}) - ${update.type}:\n\n${update.text}\n\nLink: ${update.link}`;
                    copyTextToClipboard(formattedText, "Update copied to clipboard!");
                });
                
                const tweetBtn = card.querySelector('.btn-tweet');
                tweetBtn.addEventListener('click', () => {
                    showTweetModal(update);
                });
                
                updatesContainer.appendChild(card);
            });
            
            dayBlock.appendChild(updatesContainer);
            feedContainer.appendChild(dayBlock);
        });
    }

    // Modal Operations
    function showTweetModal(update) {
        // Construct the draft
        // X counts links as 23 characters regardless of length, so standard limit 280
        const dateStr = update.date;
        const typeStr = update.type;
        const linkStr = update.link;
        
        const prefix = `BigQuery Update (${dateStr}) - ${typeStr}:\n\n`;
        const suffix = `\n\nLearn more: ${linkStr}`;
        
        // Standard limit: 280. Prefix + Suffix is around 110 chars. 
        // We will truncate the core text to fit within 280 characters safely.
        // Let's compute actual length with link counted as 23 chars
        const linkCharsVal = 23;
        const textWithoutLinkLength = prefix.length + (suffix.length - linkStr.length + linkCharsVal);
        const maxTextLen = 280 - textWithoutLinkLength - 4; // 4 chars buffer (dots)
        
        let displayBody = update.text;
        if (displayBody.length > maxTextLen) {
            displayBody = displayBody.substring(0, maxTextLen) + '...';
        }
        
        const defaultTweet = `${prefix}${displayBody}${suffix}`;
        
        tweetTextarea.value = defaultTweet;
        updateCharCount();
        
        tweetModal.style.display = 'flex';
        tweetTextarea.focus();
        tweetTextarea.setSelectionRange(prefix.length, prefix.length + displayBody.length);
        
        // Disable body scroll when modal open
        document.body.style.overflow = 'hidden';
    }

    function hideTweetModal() {
        tweetModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        
        // Calculate length taking into account Twitter/X link shortening rule (all URLs are 23 chars)
        // Find URLs in text
        const urlRegex = /https?:\/\/[^\s]+/g;
        let xLength = text.length;
        const urls = text.match(urlRegex) || [];
        
        urls.forEach(url => {
            xLength = xLength - url.length + 23;
        });
        
        charCounter.textContent = `${xLength} / 280`;
        
        // UI colors based on length
        charCounter.classList.remove('warning', 'error');
        tweetWarning.style.display = 'none';
        submitTweetBtn.disabled = false;
        
        if (xLength > 280) {
            charCounter.classList.add('error');
            tweetWarning.style.display = 'flex';
            submitTweetBtn.classList.remove('btn-primary');
            submitTweetBtn.classList.add('btn-secondary');
        } else {
            submitTweetBtn.classList.remove('btn-secondary');
            submitTweetBtn.classList.add('btn-primary');
            if (xLength > 250) {
                charCounter.classList.add('warning');
            }
        }
    }

    // Helper functions
    function setLoading(isLoading) {
        if (isLoading) {
            loadingState.style.display = 'flex';
            errorState.style.display = 'none';
            emptyState.style.display = 'none';
            feedContainer.style.display = 'none';
            refreshIcon.classList.add('spinning');
            refreshBtn.disabled = true;
        } else {
            loadingState.style.display = 'none';
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    function setErrorState(isError) {
        if (isError) {
            errorState.style.display = 'flex';
            feedContainer.style.display = 'none';
            emptyState.style.display = 'none';
            loadingState.style.display = 'none';
        } else {
            errorState.style.display = 'none';
        }
    }

    function showToast(message, isWarning = false) {
        toastText.textContent = message;
        toast.className = 'toast show';
        if (isWarning) {
            toast.style.background = 'var(--color-issue)';
            toast.style.boxShadow = '0 10px 25px rgba(245, 158, 11, 0.3)';
        } else {
            toast.style.background = '#10b981';
            toast.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)';
        }
        
        toast.style.display = 'flex';
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.style.display = 'none';
            }, 300);
        }, 3000);
    }

    function copyTextToClipboard(text, successMsg) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMsg);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers or permission block
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";  // avoid scrolling to bottom
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                showToast(successMsg);
            } catch (copyErr) {
                showToast("Failed to copy text. Please select and copy manually.", true);
            }
            document.body.removeChild(textArea);
        });
    }
});
