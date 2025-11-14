import { CDPClient } from './types';
/**
 * ElementHandle represents a DOM element that can be interacted with
 */
export declare class ElementHandle {
    private nodeId;
    private objectId;
    private backendId;
    private frameId;
    private cdp;
    private ensureFrameDocumentFn;
    private releaseRemoteObjectFn;
    private logDebug;
    constructor(nodeId: number, objectId: string | null, backendId: number | null, frameId: string | null, cdp: CDPClient, ensureFrameDocumentFn: (frameId: string | null) => Promise<void>, releaseRemoteObjectFn: (objectId: string) => Promise<void>, logDebug: (event: string, payload?: Record<string, any>) => void);
    /**
     * Click this element
     */
    click(): Promise<boolean>;
    /**
     * Type text into this element (must be an input/textarea)
     */
    type(text: string, minDelay?: number, maxDelay?: number): Promise<boolean>;
    /**
     * Clear the element's value
     */
    clear(): Promise<boolean>;
    /**
     * Focus this element
     */
    focus(): Promise<boolean>;
    /**
     * Get element property value
     */
    getProperty(propertyName: string): Promise<any>;
    /**
     * Get element attribute value
     */
    getAttribute(name: string): Promise<string | null>;
    /**
     * Get element text content
     */
    textContent(): Promise<string>;
    /**
     * Check if element is visible
     */
    isVisible(): Promise<boolean>;
    /**
     * Scroll element into view
     */
    scrollIntoView(): Promise<boolean>;
    /**
     * Dispose of this handle and release resources
     */
    dispose(): Promise<void>;
}
//# sourceMappingURL=element-handle.d.ts.map