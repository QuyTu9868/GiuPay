import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",   // ← fix: mcopy chỉ có từ Cancun
    },
  },

  networks: {
    hardhat: {
      hardfork: "cancun",     // ← local node cũng dùng cancun
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
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

export default config;