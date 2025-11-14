import { CDPClient } from './types';
/**
 * Click an element by selector
 */
export declare function clickButton(cdp: CDPClient, selector: string, checkVisibility?: boolean): Promise<boolean>;
/**
 * Fallback DOM click using JavaScript
 */
export declare function fallbackDomClick(cdp: CDPClient, objectId: string | null): Promise<boolean>;
/**
 * Click an element by backend DOM node ID
 */
export declare function clickByBackend(cdp: CDPClient, ensureFrameDocumentFn: (frameId: string | null) => Promise<void>, frameDocumentsRequested: Set<string>, logDebug: (event: string, payload?: Record<string, any>) => void, releaseRemoteObjectFn: (objectId: string) => Promise<void>, fallbackDomClickFn: (objectId: string | null) => Promise<boolean>, backendId: number, frameId: string | null): Promise<boolean>;
/**
 * Type text with human-like delays
 */
export declare function typeText(cdp: CDPClient, text: string, minDelay?: number, maxDelay?: number): Promise<boolean>;
/**
 * Fill input field
 */
export declare function fillInput(cdp: CDPClient, clickButtonFn: (selector: string) => Promise<boolean>, clearInputFn: (selector: string) => Promise<boolean>, typeTextFn: (value: string) => Promise<boolean>, selector: string, value: string): Promise<boolean>;
/**
 * Clear input field
 */
export declare function clearInput(cdp: CDPClient, selector: string): Promise<boolean>;
/**
 * Press a keyboard key (e.g., 'Enter', 'ArrowUp', 'Shift', etc.)
 * Uses proper CDP key event sequence: rawKeyDown -> char -> keyUp
 * Supports modifier keys and proper keyDown/keyUp events
 */
export declare function pressKey(cdp: CDPClient, key: string, options?: {
    modifiers?: number;
    delay?: number;
}): Promise<boolean>;
/**
 * Double click an element by selector
 */
export declare function doubleClick(cdp: CDPClient, selector: string): Promise<boolean>;
//# sourceMappingURL=element-interaction.d.ts.map