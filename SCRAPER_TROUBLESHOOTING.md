# 🔧 Scraper Troubleshooting Guide

## Browser Executable Issues

### Problem
```
Error: Tried to find the browser at the configured path (/usr/bin/chromium-browser), but no executable was found.
```

### Solution
The scrapers have been updated with automatic browser detection for Windows, macOS, and Linux systems.

### ✅ **Fixed in Latest Version**
- **Auto-detection**: Automatically finds Chrome or Edge on Windows
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Fallback support**: Uses Puppeteer's default detection if custom paths fail
- **Logging**: Shows which browser executable is being used

### **Supported Browsers (in order of preference)**

#### Windows:
1. `C:\Program Files\Google\Chrome\Application\chrome.exe`
2. `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
3. `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`
4. `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
5. `C:\Program Files\Microsoft\Edge\Application\msedge.exe`

#### macOS:
1. `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

#### Linux:
- Uses Puppeteer's default browser detection

### **Manual Installation (if needed)**

#### Install Google Chrome:
1. **Windows**: Download from https://www.google.com/chrome/
2. **macOS**: Download from https://www.google.com/chrome/
3. **Linux**: 
   ```bash
   # Ubuntu/Debian
   wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
   sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
   sudo apt update
   sudo apt install google-chrome-stable
   ```

#### Alternative: Use Microsoft Edge (Windows):
Edge is pre-installed on Windows 10/11 and will be automatically detected.

### **Testing the Fix**

1. **Restart the application**:
   ```bash
   npm run dev
   # or
   npm start
   ```

2. **Test scraping**:
   - Navigate to `/ecommerce-scraper-test`
   - Select a profession
   - Click "Scrape" on any platform
   - Check console logs for browser detection messages

3. **Expected logs**:
   ```
   [AMAZON INFO]: Found browser executable { path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" }
   [AMAZON INFO]: Using browser executable path { executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" }
   ```

### **Additional Troubleshooting**

#### If scraping still fails:

1. **Check browser installation**:
   - Ensure Chrome or Edge is properly installed
   - Try opening the browser manually to verify it works

2. **Check permissions**:
   - Ensure the application has permission to execute the browser
   - On Windows, try running as administrator if needed

3. **Environment variables**:
   - Check if `LOCALAPPDATA` environment variable is set correctly
   - Verify browser installation paths

4. **Firewall/Antivirus**:
   - Some antivirus software may block Puppeteer
   - Add exceptions for Node.js and the browser executable

5. **Alternative solution** - Set custom path:
   ```javascript
   // In scraper files, you can manually set the path:
   const executablePath = 'C:\\path\\to\\your\\chrome.exe';
   ```

### **Performance Notes**

- **First run**: May take longer as browser initializes
- **Subsequent runs**: Should be faster with browser caching
- **Headless mode**: Runs faster without GUI (default setting)
- **Memory usage**: Each platform scraper uses ~100-200MB RAM

### **Platform-Specific Issues**

#### Windows:
- **Path separators**: Use double backslashes (`\\`) in paths
- **Permissions**: May need admin rights for some installations
- **Windows Defender**: May flag Puppeteer as suspicious

#### macOS:
- **Gatekeeper**: May need to allow Chrome in Security preferences
- **Permissions**: May need to grant accessibility permissions

#### Linux:
- **Dependencies**: May need additional libraries:
  ```bash
  sudo apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
  ```

### **Success Indicators**

✅ **Scraping working correctly when you see**:
- Browser executable path logged in console
- Products being returned from API calls
- No "browser not found" errors
- Response times under 30 seconds per platform

❌ **Still having issues if you see**:
- "No browser executable found" warnings
- Empty product arrays returned
- Timeout errors
- "Navigation timeout" messages

### **Getting Help**

If issues persist:
1. Check the console logs for detailed error messages
2. Verify browser installation and paths
3. Test with a simple Puppeteer script to isolate the issue
4. Consider using Docker for consistent browser environment

---

**Note**: The scraper fixes are automatically applied. No manual configuration needed for standard Chrome/Edge installations.