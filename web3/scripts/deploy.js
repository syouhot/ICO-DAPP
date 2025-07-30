const hre = require("hardhat");
async function main() { 
    // const { deployer } = await hre.ethers.getSigners();
    const { firstAccount } = await hre.getNamedAccounts();
    console.log("firstAccount:", firstAccount);
    console.log("Deploying contracts with the account:", firstAccount);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(firstAccount)).toString());

    const netWork = await hre.ethers.provider.getNetwork();
    console.log("Network:", netWork.name);
    
    console.log("deploying contract...");

    const TokenICO = await hre.ethers.getContractFactory("TokenICO");
    const tokenICO = await TokenICO.deploy();
    await tokenICO.deployed();

    console.log("deployed tokenICO successfully");
    console.log("__________________________________________________");
    console.log("NEXT_PUBLIC_TOKEN_ICO_ADDRESS:", tokenICO.address);
    console.log("NEXT_PUBLIC_OWNER_ADDRESS:", firstAccount);

    const LINKTUM = await hre.ethers.getContractFactory("LINKTUM");
    const linktum = await LINKTUM.deploy();
    await linktum.deployed();

    console.log("deployed LINKTUM successfully");
    console.log("__________________________________________________");
    console.log("NEXT_PUBLIC_LINKTUM_ADDRESS:", linktum.address);
    console.log("NEXT_PUBLIC_OWNER_ADDRESS:", firstAccount);
    
}

main().then(() => {
    process.exit(0)
}).catch((error) => {
    console.error(error);
    process.exit(1)
})



// sepolia

// NEXT_PUBLIC_TOKEN_ICO_ADDRESS
// 0x460591A9Eb377a530a5a1567bB1528b73bf6a6c5
// NEXT_PUBLIC_LINKTUM_ADDRESS
// 0x8D8622b85446845B1cFB58Cdb8dAc2746d9Fb1df