// npx hardhat compile 
// npx ts-node scripts/index.ts 
// npx hardhat verify --network base-sepolia 0x313051436d71EC1Fa08A32322a1A01A33c7c851c  "0x79A1027a6A159502049F10906D333EC57E95F083" "10004" "1"

import { ethers, ContractFactory } from "ethers";
import { readFileSync } from 'fs';
import {
    tryNativeToHexString,
    CHAIN_ID_SEPOLIA,
    CHAIN_ID_BASE_SEPOLIA,
} from "@certusone/wormhole-sdk";

require("dotenv").config();
import { SEPOLIA, BASE_SEPOLIA, WALLET_PRIVATE_KEY, wormholeAddr1, wormholeAddr2 } from "../const"
import {
    UniversalAddress,
    createVAA,
    serialize,
    encoding,
} from "@wormhole-foundation/sdk";

// Initialize provider and wallet
const provider1 = new ethers.providers.JsonRpcProvider(SEPOLIA);
const wallet1 = new ethers.Wallet(WALLET_PRIVATE_KEY, provider1);

const provider2 = new ethers.providers.JsonRpcProvider(BASE_SEPOLIA);
const wallet2 = new ethers.Wallet(WALLET_PRIVATE_KEY, provider2);

let signedHelloWorldMessage: any;

// Get and log wallet balance
async function logWalletBalance() {
    console.log(await provider1.getBalance(wallet1.address))
    console.log(await provider2.getBalance(wallet2.address))
}

// Add contract artifact import and ABI
const helloWorldJson = JSON.parse(
    readFileSync('artifacts/contracts/01_hello_world/HelloWorld.sol/HelloWorld.json', 'utf8')
);

async function createHelloWorld() {
    const HelloWorld = new ContractFactory(
        helloWorldJson.abi,
        helloWorldJson.bytecode,
        wallet1
    );

    // const helloWorld1 = await HelloWorld.deploy(
    //     wormholeAddr1,  // wormhole address
    //     CHAIN_ID_SEPOLIA,  // chainId for Sepolia
    //     1  // finality
    // );
    // await helloWorld1.waitForDeployment();
    // console.log("HelloWorld deployed on Sepolia:", await helloWorld1.getAddress());

    // Deploy HelloWorld on Base Sepolia
    const helloWorld2 = await HelloWorld.connect(wallet2).deploy(
        wormholeAddr2,  // wormhole address
        CHAIN_ID_BASE_SEPOLIA,  // chainId for Base Sepolia
        1  // finality
    );

    console.log("HelloWorld deployed on Base Sepolia:", await helloWorld2.address);

    return { helloWorld2 };
}

async function registerEmitters(helloWorld1: any, helloWorld2: any) {

    // Register helloWorld2 (Base Sepolia) as emitter on helloWorld1 (Sepolia)
    const targetContract2AddressHex = "0x" + tryNativeToHexString(helloWorld2.address, CHAIN_ID_SEPOLIA);
    console.log("Registering Base Sepolia contract on Sepolia...");
    const receipt1 = await helloWorld1.registerEmitter(CHAIN_ID_BASE_SEPOLIA, targetContract2AddressHex);
    await receipt1.wait();

    // Verify registration
    const emitterOn1 = await helloWorld1.getRegisteredEmitter(CHAIN_ID_BASE_SEPOLIA);
    console.log("Registered emitter on Sepolia:", emitterOn1);
    console.log("Expected address:", targetContract2AddressHex);

    // Register helloWorld1 (Sepolia) as emitter on helloWorld2 (Base Sepolia)
    const targetContract1AddressHex = "0x" + tryNativeToHexString(helloWorld1.address, CHAIN_ID_BASE_SEPOLIA);
    console.log("Registering Sepolia contract on Base Sepolia...");
    const receipt2 = await helloWorld2.registerEmitter(CHAIN_ID_SEPOLIA, targetContract1AddressHex);
    await receipt2.wait();

    // Verify registration
    const emitterOn2 = await helloWorld2.getRegisteredEmitter(CHAIN_ID_SEPOLIA);
    console.log("Registered emitter on Base Sepolia:", emitterOn2);
    console.log("Expected address:", targetContract1AddressHex);
}

async function sendMsgFrom1to2(helloWorld1: any, msg: any) {
    console.log("start send")

    const receipt = await helloWorld1
        .sendMessage(msg)
        .then((tx: ethers.ContractTransaction) => tx.wait())
        .catch((msg: any) => {
            // should not happen
            console.log(msg);
            return null;
        });
    console.log("finish send")
}

async function receiveMsg(helloWorld2: any, msg: any) {
    const receipt = await helloWorld2
        .receiveMessage(msg)
        .then((tx: ethers.ContractTransaction) => tx.wait())
        .catch((msg: any) => {
            // should not happen
            console.log(msg);
            return null;
        });
    console.log("receipt:")
    console.log(receipt)

    // const wormhole2 = new ethers.Contract(
    //     wormholeAddr2,
    //     [
    //         "function parseVM(bytes memory encodedVM) external pure returns (tuple(uint8 version, uint32 timestamp, uint32 nonce, uint16 emitterChainId, bytes32 emitterAddress, uint64 sequence, uint8 consistencyLevel, bytes payload, uint32 guardianSetIndex, tuple(bytes32 r, bytes32 s, uint8 v, uint8 guardianIndex)[] signatures, bytes32 hash))",
    //     ],
    //     wallet2
    // );

    // // parse the verified message by calling the wormhole core endpoint `parseVM`.
    // const parsedVerifiedMessage = await wormhole2.parseVM(
    //     signedHelloWorldMessage
    // );

    // // Query the contract using the verified message's hash to confirm
    // // that the correct payload was saved in storage.
    // const storedMessage = await helloWorld1.getReceivedMessage(
    //     parsedVerifiedMessage.hash
    // );
    // console.log(storedMessage)

    // // confirm that the contract marked the message as "consumed"
    // const isMessageConsumed = await helloWorld1.isMessageConsumed(
    //     parsedVerifiedMessage.hash
    // );
    // console.log(isMessageConsumed)
}


async function main() {
    // await logWalletBalance();

    // const { helloWorld2 } = await createHelloWorld();

    // deployed helloworld: 0x8E64c5DC2DA6BF47E6e58fb368A948689294952F / 0xa1aa2e2dc9c34f8263b4487e6ca0fc6740290c6a
    const helloWorld1 = new ethers.Contract(
        "0x8E64c5DC2DA6BF47E6e58fb368A948689294952F",
        helloWorldJson.abi,
        wallet1
    );

    const helloWorld2 = new ethers.Contract(
        "0xa1aa2e2dc9c34f8263b4487e6ca0fc6740290c6a",
        helloWorldJson.abi,
        wallet2
    );

    // await registerEmitters(helloWorld1, helloWorld2);

    const sendMsg: any = "0x5678"

    // await sendMsgFrom1to2(helloWorld1, sendMsg);

    let msg = "0x0100000101010001010000010100000101000001010000010100000101000010010000010100111001100011011100010110010000111001010001010011000100101011011000100100111001101001011000100011001101001101011010110100101100110001010001010110011001110000010001100101010101111000001101010111001001000111010001110011010000110000010001010110001101110001011101110100010101001101010001110101011001011010011110010110100001000111010100100100011101010010010101100101100001000101010011010110010000110010011100000110011100110001010110010011010000110100011011010100100001110110011110000111011101111010001110000011100101000001001100100010111101110010001011110110011101010111011011000100100001011000010001000110111001101000010011000100100101110111010001000011001100111001001010110110100001010101010000100101101000110001001100000011010001101011010000010100000101000001010000010100000101000001011011100100010101100111010000010100000101000001010000010100000101000001010000010100000101000001010000010100000101000001010000010100000101000001010010010011010101101011011110000110010001110111011101000111000001110010001110010100100000110101011101010101011101010000011100110011001001101001011100000101001101000111011010010101001101101100010010100101010101110110010000010100000101000001010000010100000101000001010000010100000101000001010000010011010001000010010000010101000101000001010001110100110101001000011001110011000101001110011010100110001100110100"

    await receiveMsg(helloWorld2, msg);
}

// Execute the main function
main().catch(console.error);
