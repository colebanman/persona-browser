import { CDPClient, PersonaBrowserConfig, NetworkRequest } from './types';
/**
 * Setup network request/response logging
 */
export declare function setupNetworkLogging(cdp: CDPClient, requestMap: Map<string, NetworkRequest>, networkLog: NetworkRequest[]): void;
/**
 * Save network log to file
 */
export declare function saveNetworkLog(config: PersonaBrowserConfig, networkLog: NetworkRequest[], filename?: string): Promise<string>;
/**
 * Get network log
 */
export declare function getNetworkLog(networkLog: NetworkRequest[]): NetworkRequest[];
/**
 * Clear network log
 */
export declare function clearNetworkLog(networkLog: NetworkRequest[], requestMap: Map<string, NetworkRequest>): void;
//# sourceMappingURL=network-logger.d.ts.map