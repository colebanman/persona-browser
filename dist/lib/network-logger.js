"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupNetworkLogging = setupNetworkLogging;
exports.saveNetworkLog = saveNetworkLog;
exports.getNetworkLog = getNetworkLog;
exports.clearNetworkLog = clearNetworkLog;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Setup network request/response logging
 */
function setupNetworkLogging(cdp, requestMap, networkLog) {
    // Track request will be sent
    cdp.Network.requestWillBeSent(({ requestId, request, timestamp }) => {
        requestMap.set(requestId, {
            requestId,
            url: request.url,
            method: request.method,
            headers: request.headers,
            postData: request.postData,
            timestamp,
            responseReceived: false
        });
    });
    // Track response received
    cdp.Network.responseReceived(({ requestId, response, timestamp }) => {
        const req = requestMap.get(requestId);
        if (req) {
            req.responseReceived = true;
            req.response = {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                mimeType: response.mimeType,
                timestamp
            };
        }
    });
    // Track loading finished to get response body
    cdp.Network.loadingFinished(async ({ requestId, timestamp }) => {
        const req = requestMap.get(requestId);
        if (req && req.responseReceived && req.response) {
            try {
                const { body, base64Encoded } = await cdp.Network.getResponseBody({ requestId });
                req.response.body = base64Encoded ? Buffer.from(body, 'base64').toString() : body;
                req.response.base64Encoded = base64Encoded;
            }
            catch (error) {
                // Some requests don't have bodies, that's okay
                req.response.bodyError = error.message;
            }
            req.loadingFinished = timestamp;
            networkLog.push(req);
        }
    });
    // Track loading failed
    cdp.Network.loadingFailed(({ requestId, timestamp, errorText }) => {
        const req = requestMap.get(requestId);
        if (req) {
            req.failed = true;
            req.errorText = errorText;
            req.loadingFailed = timestamp;
            networkLog.push(req);
        }
    });
}
/**
 * Save network log to file
 */
async function saveNetworkLog(config, networkLog, filename) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filepath = path.join(config.logDir || './network-logs', filename || `network-log-${timestamp}.json`);
        fs.writeFileSync(filepath, JSON.stringify(networkLog, null, 2));
        console.log(`Network log saved: ${filepath} (${networkLog.length} entries)`);
        return filepath;
    }
    catch (error) {
        console.error('Error saving network log:', error);
        throw error;
    }
}
/**
 * Get network log
 */
function getNetworkLog(networkLog) {
    return networkLog;
}
/**
 * Clear network log
 */
function clearNetworkLog(networkLog, requestMap) {
    networkLog.length = 0;
    requestMap.clear();
    console.log('Network log cleared');
}
//# sourceMappingURL=network-logger.js.map