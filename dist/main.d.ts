import { ElementHandle } from './lib/element-handle';
import { PersonaBrowserConfig, NetworkRequest, ScrollOptions, ScreenshotOptions, ScreenshotResult, ClickElementByTextOptions, AccessibilityNode, WaitForSelectorOptions, WaitForNavigationOptions, NetworkResponse, NetworkRequestInfo, ResponsePredicate, RequestPredicate, RequestInterceptor } from './lib/types';
/**
 * PersonaBrowser - Minimal automated browser control with network logging
 *
 * @class PersonaBrowser
 * @example
 * const automation = new PersonaBrowser({
 *     headless: false,
 *     windowSize: { width: 1200, height: 800 },
 *     userDataDir: '/path/to/user/data' // Optional: custom Chrome user data directory
 * });
 */
export declare class PersonaBrowser {
    private config;
    private chrome;
    private client;
    private cdp;
    private networkLog;
    private requestMap;
    private isolatedWorldContexts;
    private frameDocumentsRequested;
    private debugLogPath;
    private requestInterceptionEnabled;
    private requestInterceptor;
    pages: Map<string, PersonaBrowser>;
    currentTargetId: string | null;
    private isLaunched;
    private isClosed;
    private _logDebug;
    private _ensureFrameDocument;
    private _collectFrameIds;
    private _ensureIsolatedWorld;
    private _releaseRemoteObject;
    private _ensureDir;
    private _axRole;
    private _axHasProp;
    private _findClickableAXAncestor;
    private _buildTextSearchExpression;
    constructor(options?: PersonaBrowserConfig);
    /**
     * Launch Chrome browser
     */
    launch(): Promise<boolean>;
    /**
     * Navigate to a URL
     *
     * @param url - URL to navigate to
     * @param timeout - Maximum time to wait for navigation (default: 30000)
     */
    navigate(url: string, timeout?: number): Promise<boolean>;
    /**
     * Wait for a new page load (useful after actions that trigger navigation)
     *
     * @param timeout - Maximum time to wait in milliseconds (default: 30000)
     *
     * @example
     * // After pressing Enter in a form that causes navigation
     * await automation.pressKey('Enter');
     * await automation.waitForPageLoad();
     *
     * // With custom timeout
     * await automation.waitForPageLoad(60000); // Wait up to 60 seconds
     */
    waitForPageLoad(timeout?: number): Promise<boolean>;
    /**
     * Click an element by selector
     */
    clickButton(selector: string): Promise<boolean>;
    /**
     * Click an element by matching visible text content.
     */
    clickElementByText(text: string, options?: ClickElementByTextOptions): Promise<boolean>;
    /**
     * Find all link elements on the page using accessibility tree
     *
     * @returns Array of link objects with name, href, backendId, etc.
     *
     * @example
     * const links = await automation.findLinks();
     * console.log(`Found ${links.length} links`);
     * links.forEach((link, i) => {
     *   console.log(`${i + 1}. ${link.name} - ${link.href}`);
     * });
     */
    findLinks(): Promise<Array<{
        node: AccessibilityNode;
        frameId?: string | null;
        backendId: number;
        name: string;
        href?: string;
    }>>;
    /**
     * Find all text elements on the page using accessibility tree
     *
     * @param options - Options for filtering text elements
     * @param options.minLength - Minimum text length (default: 1)
     * @param options.maxLength - Maximum text length (default: Infinity)
     * @param options.role - Filter by accessibility role (e.g., 'heading', 'paragraph', etc.)
     *
     * @returns Array of text element objects with text, role, backendId, etc.
     *
     * @example
     * // Find all headings
     * const headings = await automation.findTextElements({ role: 'heading' });
     *
     * // Find all text elements with at least 10 characters
     * const longTexts = await automation.findTextElements({ minLength: 10 });
     */
    findTextElements(options?: {
        minLength?: number;
        maxLength?: number;
        role?: string;
    }): Promise<Array<{
        node: AccessibilityNode;
        frameId?: string | null;
        backendId: number;
        text: string;
        role: string;
    }>>;
    /**
     * Click a link element by index (0-based)
     *
     * @param index - Index of the link to click (0 = first link, 1 = second link, etc.)
     *
     * @example
     * // Click the first link on the page
     * await automation.clickLinkByIndex(0);
     *
     * // Click the third link
     * await automation.clickLinkByIndex(2);
     */
    clickLinkByIndex(index: number): Promise<boolean>;
    /**
     * Click a link element by matching text content
     *
     * @param text - Text to search for in link name or href
     * @param options - Search options
     * @param options.exact - Whether to match exact text (default: false)
     * @param options.caseSensitive - Whether search is case sensitive (default: false)
     *
     * @example
     * // Click link containing "Google"
     * await automation.clickLinkByText('Google');
     *
     * // Click link with exact text match
     * await automation.clickLinkByText('Home', { exact: true });
     */
    clickLinkByText(text: string, options?: {
        exact?: boolean;
        caseSensitive?: boolean;
    }): Promise<boolean>;
    /**
     * Type text with human-like delays
     */
    typeText(text: string, minDelay?: number, maxDelay?: number): Promise<boolean>;
    /**
     * Fill input field
     */
    fillInput(selector: string, value: string): Promise<boolean>;
    /**
     * Clear input field
     */
    clearInput(selector: string): Promise<boolean>;
    /**
     * Press a keyboard key (e.g., 'Enter', 'ArrowUp', 'Shift', etc.)
     * Supports modifier keys and proper keyDown/keyUp events
     *
     * @param key - The key to press (e.g., 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'Tab', 'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown')
     * @param options - Options for key press
     * @param options.modifiers - Bitmask for modifier keys: 1=Alt, 2=Control, 4=Meta, 8=Shift (can be combined, e.g., 8|2 for Shift+Control)
     * @param options.delay - Delay between keyDown and keyUp in milliseconds (default: 10)
     *
     * @example
     * // Press Enter key
     * await automation.pressKey('Enter');
     *
     * // Press Arrow Up
     * await automation.pressKey('ArrowUp');
     *
     * // Press Shift+Enter
     * await automation.pressKey('Enter', { modifiers: 8 }); // 8 = Shift
     *
     * // Press Control+Shift+A
     * await automation.pressKey('a', { modifiers: 8 | 2 }); // 8 = Shift, 2 = Control
     */
    pressKey(key: string, options?: {
        modifiers?: number;
        delay?: number;
    }): Promise<boolean>;
    /**
     * Double click an element by selector
     *
     * @param selector - CSS selector for the element to double click
     *
     * @example
     * await automation.doubleClick('button.submit');
     */
    doubleClick(selector: string): Promise<boolean>;
    /**
     * Execute JavaScript in the page context
     */
    executeJS(expression: string): Promise<any>;
    /**
     * Wait for selector to appear
     *
     * @param selector - CSS selector
     * @param options - Wait options (visible, hidden, attached, timeout) or legacy timeout number
     * @returns ElementHandle if options provided, otherwise boolean for backward compatibility
     *
     * @example
     * // Wait for visible element
     * await automation.waitForSelector('#button', { visible: true });
     *
     * // Wait for element to be hidden
     * await automation.waitForSelector('#loading', { hidden: true });
     *
     * // Legacy: timeout only
     * await automation.waitForSelector('#button', 5000);
     */
    waitForSelector(selector: string, options?: WaitForSelectorOptions | number): Promise<ElementHandle | boolean>;
    /**
     * Take screenshot
     */
    screenshot(filepath?: string | ScreenshotOptions, options?: ScreenshotOptions): Promise<string | ScreenshotResult | undefined>;
    /**
     * Scroll the page or a specific scrollable container.
     */
    scrollBy(options?: number | ScrollOptions): Promise<any>;
    /**
     * Get all cookies
     */
    getCookies(): Promise<any[]>;
    /**
     * Set cookies
     */
    setCookies(cookies: any[]): Promise<boolean>;
    /**
     * Reload the current page
     *
     * @param options - Reload options
     * @param options.waitUntil - Wait strategy (default: 'load')
     * @param options.timeout - Maximum time to wait (default: 30000)
     */
    reload(options?: {
        waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
        timeout?: number;
    }): Promise<boolean>;
    /**
     * Navigate back in browser history
     *
     * @param options - Navigation options
     * @param options.waitUntil - Wait strategy (default: 'load')
     * @param options.timeout - Maximum time to wait (default: 30000)
     */
    goBack(options?: {
        waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
        timeout?: number;
    }): Promise<boolean>;
    /**
     * Navigate forward in browser history
     *
     * @param options - Navigation options
     * @param options.waitUntil - Wait strategy (default: 'load')
     * @param options.timeout - Maximum time to wait (default: 30000)
     */
    goForward(options?: {
        waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
        timeout?: number;
    }): Promise<boolean>;
    /**
     * Get current page URL
     */
    url(): Promise<string>;
    /**
     * Get current page title
     */
    title(): Promise<string>;
    /**
     * Wait for navigation with options
     *
     * @param options - Navigation wait options
     * @param options.waitUntil - Wait strategy: 'load', 'domcontentloaded', 'networkidle0', 'networkidle2'
     * @param options.timeout - Maximum time to wait (default: 30000)
     * @param options.url - URL pattern to wait for (string or RegExp)
     */
    waitForNavigation(options?: WaitForNavigationOptions): Promise<NetworkResponse | null>;
    /**
     * Wait for a network response matching a predicate
     *
     * @param predicate - Function that returns true when response matches
     * @param timeout - Maximum time to wait (default: 30000)
     *
     * @example
     * // Wait for API response
     * const response = await automation.waitForResponse(
     *   (r) => r.url.includes('/api/data') && r.status === 200
     * );
     */
    waitForResponse(predicate: ResponsePredicate, timeout?: number): Promise<NetworkResponse>;
    /**
     * Wait for a network request matching a predicate
     *
     * @param predicate - Function that returns true when request matches
     * @param timeout - Maximum time to wait (default: 30000)
     *
     * @example
     * // Wait for API request
     * const request = await automation.waitForRequest(
     *   (r) => r.url.includes('/api/submit') && r.method === 'POST'
     * );
     */
    waitForRequest(predicate: RequestPredicate, timeout?: number): Promise<NetworkRequestInfo>;
    /**
     * Enable request interception
     *
     * @param interceptor - Function to intercept/modify/block requests
     *
     * @example
     * // Block ads
     * automation.setRequestInterception(async (request) => {
     *   if (request.url.includes('ads')) {
     *     return { url: 'about:blank' }; // Block
     *   }
     * });
     *
     * // Modify headers
     * automation.setRequestInterception(async (request) => {
     *   return {
     *     headers: { ...request.headers, 'X-Custom': 'value' }
     *   };
     * });
     */
    setRequestInterception(interceptor: RequestInterceptor): void;
    /**
     * Disable request interception
     */
    disableRequestInterception(): void;
    /**
     * Query selector - returns ElementHandle or null
     *
     * @param selector - CSS selector
     * @returns ElementHandle if found, null otherwise
     *
     * @example
     * const button = await automation.$('#submit');
     * if (button) {
     *   await button.click();
     * }
     */
    $(selector: string): Promise<ElementHandle | null>;
    /**
     * Query selector all - returns array of ElementHandles
     *
     * @param selector - CSS selector
     * @returns Array of ElementHandles
     *
     * @example
     * const buttons = await automation.$$('button');
     * for (const button of buttons) {
     *   await button.click();
     * }
     */
    $$(selector: string): Promise<ElementHandle[]>;
    /**
     * Get the full accessibility tree for the current page
     */
    getAccessibilityTree(options?: {
        depth?: number;
        frameId?: string;
    }): Promise<import('./lib/accessibility-tree').AccessibilityTree>;
    /**
     * Get a partial accessibility tree for a specific DOM node
     */
    getPartialAccessibilityTree(nodeId: number, options?: {
        fetchRelatives?: boolean;
    }): Promise<import('./lib/accessibility-tree').AccessibilityTree>;
    /**
     * Query the accessibility tree for nodes matching specific criteria
     */
    queryAccessibilityTree(nodeId: number, options?: {
        accessibleName?: string;
        role?: string;
    }): Promise<any[]>;
    /**
     * Flatten the accessibility tree into a list with depth information
     */
    flattenAccessibilityTree(tree: import('./lib/accessibility-tree').AccessibilityTree): AccessibilityNode[];
    /**
     * Find nodes in the accessibility tree by role
     */
    findNodesByRole(tree: import('./lib/accessibility-tree').AccessibilityTree, role: string): AccessibilityNode[];
    /**
     * Find nodes in the accessibility tree by accessible name
     */
    findNodesByName(tree: import('./lib/accessibility-tree').AccessibilityTree, name: string): AccessibilityNode[];
    /**
     * Save network log to file
     */
    saveNetworkLog(filename?: string): Promise<string>;
    /**
     * Get network log
     */
    getNetworkLog(): NetworkRequest[];
    /**
     * Clear network log
     */
    clearNetworkLog(): void;
    /**
     * Create a new page/tab
     *
     * @returns New PersonaBrowser instance for the new page
     *
     * @example
     * const page1 = await automation.newPage();
     * await page1.navigate('https://example.com');
     *
     * const page2 = await automation.newPage();
     * await page2.navigate('https://google.com');
     */
    newPage(): Promise<PersonaBrowser>;
    /**
     * Get all open pages
     *
     * @returns Array of PersonaBrowser instances, one for each page
     */
    getPages(): PersonaBrowser[];
    /**
     * Get the current target ID
     */
    getCurrentTargetId(): string | null;
    /**
     * Close a specific page
     *
     * @param targetId - Target ID of the page to close (default: current page)
     */
    closePage(targetId?: string): Promise<void>;
    /**
     * Close browser and save network log
     */
    close(saveLog?: boolean): Promise<void>;
    /**
     * Internal method to ensure browser is launched before operations
     * @private
     */
    private _ensureLaunched;
}
export default PersonaBrowser;
//# sourceMappingURL=main.d.ts.map