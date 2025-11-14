import { CDPClient } from './types';
import PersonaBrowser from '../main';
/**
 * Page represents a browser tab/page
 * Each Page instance can be used like a PersonaBrowser instance but for a specific tab
 */
export declare class Page {
    private targetId;
    private cdp;
    private automation;
    constructor(targetId: string, cdp: CDPClient, automation: PersonaBrowser);
    /**
     * Get the target ID of this page
     */
    getTargetId(): string;
    /**
     * Get the CDP client for this page
     */
    getCDP(): CDPClient;
    /**
     * Get the parent automation instance
     */
    getAutomation(): PersonaBrowser;
    /**
     * Close this page
     */
    close(): Promise<void>;
}
//# sourceMappingURL=page.d.ts.map