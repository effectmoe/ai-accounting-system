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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function verifyBuildOutput() {
    const outputDir = '.mastra/output';
    const expectedFiles = [
        'index.mjs',
        'package.json'
    ];
    console.log('🔍 Verifying build output...');
    // Check if output directory exists
    if (!fs.existsSync(outputDir)) {
        console.error('❌ .mastra/output directory does not exist');
        console.log('💡 Run "npm run build" to generate the output');
        return false;
    }
    // Check for required files
    let allFilesExist = true;
    for (const file of expectedFiles) {
        const filePath = path.join(outputDir, file);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Required file not found: ${file}`);
            allFilesExist = false;
        }
        else {
            const stats = fs.statSync(filePath);
            console.log(`✅ ${file} (${stats.size} bytes)`);
        }
    }
    if (!allFilesExist) {
        return false;
    }
    // Verify index.mjs content
    const indexPath = path.join(outputDir, 'index.mjs');
    const content = fs.readFileSync(indexPath, 'utf8');
    if (content.includes('export') || content.includes('Hono') || content.includes('server')) {
        console.log('✅ Server code generated successfully');
    }
    else {
        console.warn('⚠️ Server code might have issues');
    }
    console.log('\n✅ Build verification complete!');
    return true;
}
// Execute verification
verifyBuildOutput().then(success => {
    process.exit(success ? 0 : 1);
});
