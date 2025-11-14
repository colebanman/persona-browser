"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Page = void 0;
/**
 * Page represents a browser tab/page
 * Each Page instance can be used like a PersonaBrowser instance but for a specific tab
 */
class Page {
    constructor(targetId, cdp, automation) {
        this.targetId = targetId;
        this.cdp = cdp;
        this.automation = automation;
    }
    /**
     * Get the target ID of this page
     */
    getTargetId() {
        return this.targetId;
    }
    /**
     * Get the CDP client for this page
     */
    getCDP() {
        return this.cdp;
    }
    /**
     * Get the parent automation instance
     */
    getAutomation() {
        return this.automation;
    }
    /**
     * Close this page
     */
    async close() {
        // Implementation will be in main.ts
        throw new Error('Page.close() should be called through PersonaBrowser');
    }
}
exports.Page = Page;
//# sourceMappingURL=page.js.map