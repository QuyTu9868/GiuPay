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
require("@nomicfoundation/hardhat-toolbox");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const config = {
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: { enabled: true, runs: 200 },
            evmVersion: "cancun", // ← fix: mcopy chỉ có từ Cancun
        },
    },
    networks: {
        hardhat: {
            hardfork: "cancun", // ← local node cũng dùng cancun
        },
        // Node local cho test luồng giao dịch (approach #1). Chạy: npx hardhat node
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },
        arc_testnet: {
            url: process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network",
            chainId: 5042002,
            ...(DEPLOYER_KEY ? { accounts: [DEPLOYER_KEY] } : {}),
        },
    },
    typechain: {
        outDir: "typechain-types",
        target: "ethers-v6",
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS === "true",
        currency: "USD",
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};
exports.default = config;
