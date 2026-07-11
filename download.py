import os
import re
import urllib.request
import urllib.parse

base_url = "https://html.kamleshyadav.com/html/miraculous/html/Bootstrap5/version3/"
base_dir = r"d:\teleCloud"

def download_file(url, path):
    if os.path.exists(path):
        # Read and return existing data if it's a CSS file so we can parse it
        if path.endswith('.css'):
            with open(path, 'rb') as f:
                return f.read()
        return None
    try:
        print(f"Downloading {url}")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
            return data
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return None

def process_css(content, css_url, css_path):
    # Find all url(...) in CSS
    urls = re.findall(r'url\([\'"]?(.*?)[\'"]?\)', content.decode('utf-8', errors='ignore'))
    for u in urls:
        if u.startswith('data:') or u.startswith('http'):
            continue
        # Clean up URL (remove query params for file saving)
        u_clean = u.split('?')[0].split('#')[0]
        if not u_clean:
            continue
        
        # Resolve absolute URL
        abs_url_clean = urllib.parse.urljoin(css_url, u_clean)
        
        # Resolve local path based on css_path and u_clean
        css_dir = os.path.dirname(css_path)
        local_path = os.path.normpath(os.path.join(css_dir, urllib.parse.unquote(u_clean)))
        
        if not os.path.exists(local_path):
            download_file(abs_url_clean, local_path)

def process_html(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find assets in href and src
    assets = re.findall(r'(?:href|src)=[\'"](assets/[^"\']+)[\'"]', content)
    # Deduplicate
    assets = list(set(assets))
    for asset in assets:
        url = urllib.parse.urljoin(base_url, asset)
        path = os.path.normpath(os.path.join(base_dir, urllib.parse.unquote(asset)))
        data = download_file(url, path)
        if data and path.endswith('.css'):
            process_css(data, url, path)

if __name__ == "__main__":
    process_html(r"d:\teleCloud\index.html")
    print("Done downloading assets.")
