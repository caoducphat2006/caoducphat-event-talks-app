import os
import re
import html
import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__, template_folder='templates', static_folder='static')

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to reduce network requests
cache = {
    'data': None,
    'timestamp': 0
}

def strip_html_tags(html_text):
    if not html_text:
        return ""
    # Replace block tags with space/newlines for cleaner text
    text = re.sub(r'</p>|<br\s*/?>', '\n', html_text, flags=re.IGNORECASE)
    text = re.sub(r'</li>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)  # remove all remaining HTML tags
    # Decode HTML entities (e.g., &amp; -> &, &quot; -> ")
    text = html.unescape(text)
    # Standardize spaces and consolidate multiple newlines
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    return text.strip()

def parse_content_updates(content_html):
    if not content_html:
        return []
    
    # Split content by <h3> headers to isolate sub-updates
    parts = re.split(r'<h3>', content_html, flags=re.IGNORECASE)
    updates = []
    
    # Text before the first <h3> (should be empty, but parsed just in case)
    first_part = parts[0].strip()
    if first_part:
        text = strip_html_tags(first_part)
        if text:
            updates.append({
                'type': 'General',
                'html': first_part,
                'text': text
            })
        
    for part in parts[1:]:
        if not part.strip():
            continue
        # Split title and description from </h3> tag
        subparts = re.split(r'</h3>', part, maxsplit=1, flags=re.IGNORECASE)
        if len(subparts) == 2:
            update_type = subparts[0].strip()
            update_html = subparts[1].strip()
        else:
            update_type = 'General'
            update_html = part.strip()
            
        updates.append({
            'type': update_type,
            'html': update_html,
            'text': strip_html_tags(update_html)
        })
    return updates

def fetch_and_parse_feed():
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry_el in root.findall('atom:entry', ns):
        title_el = entry_el.find('atom:title', ns)
        title = title_el.text if title_el is not None else "Unknown Date"
        
        updated_el = entry_el.find('atom:updated', ns)
        updated = updated_el.text if updated_el is not None else ""
        
        link_el = entry_el.find('atom:link', ns)
        link = ""
        if link_el is not None:
            link = link_el.attrib.get('href', '')
            # If it's a relative link, construct it (though Google Cloud feeds usually use absolute links)
            if link.startswith('/'):
                link = "https://cloud.google.com" + link
                
        content_el = entry_el.find('atom:content', ns)
        content_html = content_el.text if content_el is not None else ""
        
        # Parse the updates out of HTML content
        updates = parse_content_updates(content_html)
        
        entries.append({
            'date': title,
            'updated': updated,
            'link': link,
            'updates': updates
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Cache duration: 10 minutes (600 seconds)
    if force_refresh or cache['data'] is None or (current_time - cache['timestamp'] > 600):
        try:
            releases = fetch_and_parse_feed()
            cache['data'] = releases
            cache['timestamp'] = current_time
        except Exception as e:
            # Fallback to cache if request fails
            if cache['data'] is not None:
                return jsonify({
                    'releases': cache['data'],
                    'cached': True,
                    'error': str(e),
                    'warning': 'Could not fetch live updates. Showing cached data.'
                })
            return jsonify({'error': f"Failed to fetch feed: {str(e)}"}), 500
            
    return jsonify({
        'releases': cache['data'],
        'cached': cache['timestamp'] == current_time and not force_refresh
    })

if __name__ == '__main__':
    # Bind to all interfaces to allow local network access if needed
    app.run(debug=True, host='127.0.0.1', port=5000)
