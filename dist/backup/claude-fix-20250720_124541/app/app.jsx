"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppInitializer = AppInitializer;
const react_1 = require("react");
const logger_1 = require("@/lib/logger");
function AppInitializer({ children }) {
    (0, react_1.useEffect)(() => {
        // 本番環境でconsoleをloggerに置き換え
        if (process.env.NODE_ENV === 'production') {
            logger_1.logger.replaceConsole();
        }
    }, []);
    return <>{children}</>;
}
