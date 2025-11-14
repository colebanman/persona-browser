import { CDPClient } from './types';
/**
 * Check if an element is visible
 */
export declare function isElementVisible(cdp: CDPClient, nodeId: number): Promise<boolean>;
/**
 * Check if an element is attached to the DOM
 */
export declare function isElementAttached(cdp: CDPClient, nodeId: number): Promise<boolean>;
/**
 * Scroll element into view if needed
 */
export declare function scrollIntoViewIfNeeded(cdp: CDPClient, nodeId: number): Promise<void>;
/**
 * Wait for element to become visible
 */
export declare function waitForElementVisible(cdp: CDPClient, nodeId: number, timeout?: number): Promise<boolean>;
/**
 * Wait for element to become hidden
 */
export declare function waitForElementHidden(cdp: CDPClient, nodeId: number, timeout?: number): Promise<boolean>;
//# sourceMappingURL=visibility-helpers.d.ts.map