# PersonaBrowser

Exceptionally lightweight automated browser control with network logging using Chrome DevTools Protocol. Built to pass advanced antibot systems including Akamai, Kasada, Shape, and Cloudflare.

## Installation

```bash
npm install persona-browser
```

## Quick Start

### CommonJS

```javascript
const { PersonaBrowser } = require('persona-browser');
// or
const PersonaBrowser = require('persona-browser').default;

async function example() {
  const browser = new PersonaBrowser({
    headless: false,
    windowSize: { width: 1200, height: 800 }
  });

  await browser.launch();
  await browser.navigate('https://example.com');
  
  // Click a button
  await browser.clickButton('#submit');
  
  // Type text
  await browser.typeText('Hello, World!');
  
  // Take a screenshot
  await browser.screenshot('screenshot.png');
  
  // Get network log
  const networkLog = browser.getNetworkLog();
  console.log('Network requests:', networkLog);
  
  await browser.close();
}

example();
```

### ES Modules

```javascript
import PersonaBrowser from 'persona-browser';
// or
import { PersonaBrowser } from 'persona-browser';

async function example() {
  const browser = new PersonaBrowser({
    headless: false,
    windowSize: { width: 1200, height: 800 }
  });

  await browser.launch();
  await browser.navigate('https://example.com');
  await browser.close();
}

example();
```

## Features

- ⚡ **Exceptionally Lightweight** - Minimal footprint (~62KB package size) with zero unnecessary dependencies
- 🛡️ **Antibot Bypass** - Successfully passes advanced antibot systems including Akamai, Kasada, Shape, and Cloudflare
- 🚀 **Minimal API** - Simple, intuitive interface
- 🌐 **Network Logging** - Track all network requests and responses
- ♿ **Accessibility Support** - Find elements using accessibility tree
- 📸 **Screenshots** - Capture page screenshots
- ⌨️ **Keyboard Input** - Type text and press keys
- 🖱️ **Mouse Actions** - Click, double-click elements
- 📜 **Multiple Pages** - Create and manage multiple tabs
- 🔍 **Element Finding** - Find elements by text, selector, or accessibility tree
- 🎯 **Request Interception** - Modify or block network requests

## API Documentation

### Constructor

```javascript
new PersonaBrowser(options?: PersonaBrowserConfig)
```

**Options:**
- `headless?: boolean` - Run browser in headless mode (default: `true`)
- `windowSize?: { width: number, height: number }` - Browser window size
- `userDataDir?: string` - Custom Chrome user data directory

### Methods

#### Navigation
- `launch()` - Launch Chrome browser
- `navigate(url: string, timeout?: number)` - Navigate to a URL
- `reload(options?)` - Reload the current page
- `goBack(options?)` - Navigate back
- `goForward(options?)` - Navigate forward
- `waitForPageLoad(timeout?: number)` - Wait for page to load
- `waitForNavigation(options?)` - Wait for navigation with options

#### Element Interaction
- `clickButton(selector: string)` - Click element by selector
- `clickElementByText(text: string, options?)` - Click element by text
- `clickLinkByIndex(index: number)` - Click link by index
- `clickLinkByText(text: string, options?)` - Click link by text
- `doubleClick(selector: string)` - Double click element
- `typeText(text: string, minDelay?: number, maxDelay?: number)` - Type text
- `fillInput(selector: string, value: string)` - Fill input field
- `clearInput(selector: string)` - Clear input field
- `pressKey(key: string, options?)` - Press a keyboard key

#### Element Finding
- `$(selector: string)` - Query selector (returns ElementHandle or null)
- `$$(selector: string)` - Query selector all (returns ElementHandle[])
- `waitForSelector(selector: string, options?)` - Wait for selector
- `findLinks()` - Find all links using accessibility tree
- `findTextElements(options?)` - Find text elements using accessibility tree

#### Accessibility
- `getAccessibilityTree(options?)` - Get full accessibility tree
- `getPartialAccessibilityTree(nodeId: number, options?)` - Get partial tree
- `queryAccessibilityTree(nodeId: number, options?)` - Query tree by criteria
- `flattenAccessibilityTree(tree)` - Flatten tree to list
- `findNodesByRole(tree, role: string)` - Find nodes by role
- `findNodesByName(tree, name: string)` - Find nodes by name

#### Network
- `getNetworkLog()` - Get all network requests
- `saveNetworkLog(filename?: string)` - Save network log to file
- `clearNetworkLog()` - Clear network log
- `waitForResponse(predicate, timeout?)` - Wait for matching response
- `waitForRequest(predicate, timeout?)` - Wait for matching request
- `setRequestInterception(interceptor)` - Enable request interception
- `disableRequestInterception()` - Disable request interception

#### Page Management
- `newPage()` - Create a new page/tab
- `getPages()` - Get all open pages
- `closePage(targetId?)` - Close a specific page
- `screenshot(filepath?, options?)` - Take screenshot
- `scrollBy(options?)` - Scroll page or container
- `url()` - Get current URL
- `title()` - Get page title
- `getCookies()` - Get all cookies
- `setCookies(cookies: any[])` - Set cookies
- `executeJS(expression: string)` - Execute JavaScript

#### Cleanup
- `close(saveLog?: boolean)` - Close browser and optionally save log

## Examples

### Basic Navigation

```javascript
const browser = new PersonaBrowser({ headless: false });
await browser.launch();
await browser.navigate('https://example.com');
await browser.close();
```

### Form Filling

```javascript
await browser.navigate('https://example.com/form');
await browser.fillInput('#name', 'John Doe');
await browser.fillInput('#email', 'john@example.com');
await browser.clickButton('#submit');
await browser.waitForPageLoad();
```

### Network Monitoring

```javascript
await browser.navigate('https://example.com');

// Wait for specific API response
const response = await browser.waitForResponse(
  (r) => r.url.includes('/api/data') && r.status === 200
);

// Get all network requests
const log = browser.getNetworkLog();
console.log(`Captured ${log.length} requests`);

// Save to file
await browser.saveNetworkLog('network.json');
```

### Request Interception

```javascript
// Block ads
browser.setRequestInterception(async (request) => {
  if (request.url.includes('ads')) {
    return { url: 'about:blank' }; // Block
  }
});

// Modify headers
browser.setRequestInterception(async (request) => {
  return {
    headers: { ...request.headers, 'X-Custom': 'value' }
  };
});
```

### Multiple Pages

```javascript
const page1 = await browser.newPage();
await page1.navigate('https://example.com');

const page2 = await browser.newPage();
await page2.navigate('https://google.com');

// Switch between pages
const pages = browser.getPages();
```

## License

MIT

## Author

Cole Banman

