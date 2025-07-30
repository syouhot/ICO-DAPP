import React, { useEffect, useState, createContext, useContext } from "react";
import { ethers } from "ethers";
import { useAccount, useConnect, useChainId, useBalance } from "wagmi";


import { useToast } from "./ToastContext";
import TOKEN_ICO_ABI from "./ABI.json";
import { useEthersProvider, useEthersSigner } from "../provider/hooks";
import { config } from "../provider/wagmiConfigs"
import { handleTransactionError, erc20Abi, generateId } from "./Utility"

const LINKTUN_ADDRESS = process.env.NEXT_PUBLIC_LINKTUN_ADDRESS;
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY;
const TOKEN_SYMBOL = process.env.NEXT_PUBLIC_TOKEN_SYMBOL;
const TOKEN_DECIMAL = process.env.NEXT_PUBLIC_TOKEN_DECIMAL;
const TOKEN_LOGO = process.env.NEXT_PUBLIC_TOKEN_LOGO;
const DOMAIN_URL = process.env.NEXT_PUBLIC_NEXT_DOMAIN_URL;
const PER_TOKEN_USD_PRICE = process.env.NEXT_PUBLIC_PER_TOKEN_USD_PRICE;
const TokenICOAbi = TOKEN_ICO_ABI.abi;
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID;

const Web3Context = createContext();

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ICO_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

const fallbackProvider = new ethers.providers.JsonRpcProvider(RPC_URL);

export const Web3Provider = ({ children }) => {
    const { notify } = useToast();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { balance } = useBalance({ config });
    const { connect, connectors } = useConnect();

    const [reCall, setReCall] = useState(0);
    const [globalLoad, setGlobalLoad] = useState(false);

    const provider = useEthersProvider();
    const signer = useEthersSigner();

    const fallbackProvider = new ethers.providers.JsonRpcProvider(RPC_URL);

    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState(null);

    const [isConnecting, setIsConnecting] = useState(false);
    const [contractInfo, setContractInfo] = useState({
        tbcAddress: null,
        tbcBalance: "0",
        ethPrice: "0",
        totalSold: "0",
    })

    const [tokenBalance, setTokenBalance] = useState({
        usertbcBalance: "0",
        contracttbcBalance: null,
        totalSupply: null,
        userEthBalance: null,
        ethPrice: "0",
        tbcBalance: "0",
    });

    const [error, setError] = useState(null);
    let toastId = null

    useEffect(() => {
        const initContract = () => {
            if (provider && signer) {
                try {
                    const contractInstance = new ethers.Contract(
                        CONTRACT_ADDRESS,
                        TokenICOAbi,
                        signer
                    )
                    console.log(contractInstance, 3333);

                    setContract(contractInstance);
                } catch (error) {
                    console.error("Error initializing contract:", error);
                    setError("Failed to initialize contract");

                }
            }
        };
        initContract();
    }, [provider, signer])


    useEffect(() => {
        const fetchContractInfo = async () => {
            setGlobalLoad(true);
            console.log("CONTRACT_ADDRESS", CONTRACT_ADDRESS);
            console.log("provider", provider);

            if (contract) {
                try {
                    const currentProvider = provider || fallbackProvider;
                    const result = await currentProvider.getCode(CONTRACT_ADDRESS)
                    console.log(result, 33333);

                    const readonlyContract = new ethers.Contract(
                        CONTRACT_ADDRESS,
                        TokenICOAbi,
                        currentProvider
                    )
                    const info = await readonlyContract.getContractInfo();
                    console.log(info);

                    const tokenDecimals = parseInt(info.tokenDecimals) || 18;
                    setContractInfo({
                        tbcAddress: info.tokenAddress,
                        tbcBalance: ethers.utils.formatUnits(
                            info.tokenBalance,
                            tokenDecimals
                        ),
                        ethPrice: ethers.utils.formatUnits(info.tokenPrice, 18),
                        totalSold: ethers.utils.formatUnits(info.tokenSold, tokenDecimals)
                    })
                    if (address && info.tokenAddress) {
                        const tokenContract = new ethers.Contract(
                            info.tokenAddress,
                            erc20Abi,
                            currentProvider
                        )
                        const [
                            userTokenBalance,
                            userEthBalance,
                            contractEthBalance,
                            totalSupply
                        ] = await Promise.all([
                            tokenContract.balanceOf(address),
                            currentProvider.getBalance(address),
                            currentProvider.getBalance(info.tokenAddress),
                            tokenContract.totalSupply(),
                        ])
                        setTokenBalance((prev) => ({
                            ...prev,
                            usertbcBalance: ethers.utils.formatUnits(userTokenBalance, tokenDecimals),
                            contracttbcBalance: ethers.utils.formatUnits(contractEthBalance, 18),
                            totalSupply: ethers.utils.formatUnits(totalSupply, tokenDecimals),
                            userEthBalance: ethers.utils.formatUnits(userEthBalance),
                            ethPrice: ethers.utils.formatUnits(info.tokenPrice, 18),
                            tbcBalance: ethers.utils.formatUnits(info.tokenBalance, tokenDecimals),
                        }));
                    }
                    setGlobalLoad(false);
                } catch (error) {
                    console.error("Error fetching contract info:", error);
                }
            }
        };
        fetchContractInfo();
    }, [contract, address, provider, signer, reCall])

    const buyToken = async (ethAmount) => {
        if (!contract || !address) return null;
        toastId = notify.start(`Buying ${TOKEN_SYMBOL} with ${CURRENCY}...`);
        try {
            const ethValue = ethers.utils.parseEther(ethAmount);
            const tx = await contract.buyToken({
                value: ethValue
            });
            notify.update(toastId, "Processing", `Waiting for confirmation...`);
            const receipt = await tx.wait();
            if (receipt.status === 1) {
                const tokenPrice = PER_TOKEN_USD_PRICE;
                const tokenReceived = parseFloat(ethAmount) / tokenPrice;
                const txDetails = {
                    timestamp: Date.now(),
                    user: address,
                    tokenIn: CURRENCY,
                    tokenOut: TOKEN_SYMBOL,
                    amountIn: ethAmount,
                    amountOut: tokenReceived.toString(),
                    transactionType: "BUY",
                    hash: receipt.transactionHash
                };
                saveTransactionLocalStorage(txDetails);
                setReCall((prev) => prev + 1);
                notify.complete(toastId, `Successfully purchased ${TOKEN_SYMBOL} tokens`);

                return receipt;

            }
        } catch (error) {
            const { message: errorMessage, code: errorCode } = handleTransactionError(error, "buying Tokens");
            if (errorCode === "ACTION_REJECTED") {
                notify.reject(toastId, `Transaction rejected by user`);
                return null;
            }
            notify.fail(
                toastId, "Transaction failed,please try again with sufficient gas",
            )
            return null;
        }
    }

    const saveTransactionLocalStorage = (txData) => {
        try {
            const existingTransactions = JSON.parse(localStorage.getItem("tokenTransactions")) || [];
            existingTransactions.push(txData);
            localStorage.setItem("tokenTransactions", JSON.stringify(existingTransactions));

            console.log("Transaction saved to local storage:", txData);

        } catch (error) {
            console.log("Error saving transaction to local storage:", error);

        }

    }

    const updateTokenPrice = async (newPrice) => {
        if (!contract || !address) return null;
        toastId = notify.start(`Updating token price ...`);
        try {
            const parsedPrice = ethers.utils.parseEther(newPrice);
            const tx = await contract.updatetokenPrice(parsedPrice);
            notify.update(toastId, "Processing", `Confirming price update...`);
            const receipt = await tx.wait();
            if (receipt.status === 1) {
                setReCall((prev) => prev + 1);
                notify.complete(toastId, `Token price update to ${newPrice} ${CURRENCY}`);
                return receipt;
            }
        } catch (error) {
            const { message: errorMessage, code: errorCode } = handleTransactionError(error, "updating token price");
            if (errorCode === "ACTION_REJECTED") {
                notify.reject(toastId, `Transaction rejected by user`);
                return null;
            }

            console.error(errorMessage);
            notify.fail(
                toastId, "price update failed,please check your premissions and try again",
            )
            return null;
        }
    }

    const setSaleToken = async (tokenAddress) => {
        if (!contract || !address) return null;
        toastId = notify.start(`Setting token price ...`);
        try {
            const tx = await contract.setSaleToken(tokenAddress);
            notify.update(toastId, "Processing", `Confirming token update...`);
            const receipt = await tx.wait();
            if (receipt.status === 1) {
                setReCall((prev) => prev + 1);
                notify.complete(toastId, `Sale token updated successfully`);
                return receipt;
            }
        } catch (error) {
            const { message: errorMessage, code: errorCode } = handleTransactionError(error, "setting sale token");
            if (errorCode === "ACTION_REJECTED") {
                notify.reject(toastId, `Transaction rejected by user`);
                return null;
            }

            console.error(errorMessage);
            notify.fail(
                toastId, "Failed to set sale token,please check the address",
            )
            return null;
        }
    }
    const withdrawAllTokens = async () => {
        if (!contract || !address) return null;
        toastId = notify.start(`withdraw tokens ...`);
        try {
            const tx = await contract.withdrawAllTokens();
            notify.update(toastId, "Processing", `Confirming withdraw...`);
            const receipt = await tx.wait();
            if (receipt.status === 1) {
                setReCall((prev) => prev + 1);
                notify.complete(toastId, `All tokens withdraw successfully`);
                return receipt;
            }
        } catch (error) {
            const { message: errorMessage, code: errorCode } = handleTransactionError(error, "Withdrawing token");
            if (errorCode === "ACTION_REJECTED") {
                notify.reject(toastId, `Transaction rejected by user`);
                return null;
            }

            console.error(errorMessage);
            notify.fail(
                toastId, "Failed to withdraw token,please try again",
            )
            return null;
        }
    }
    const rescueToken = async (tokenAddress) => {
        if (!contract || !address) return null;
        toastId = notify.start(`resucing tokens ...`);
        try {
            const tx = await contract.rescueToken(tokenAddress);
            notify.update(toastId, "Processing", `Confirming recue operation...`);
            const receipt = await tx.wait();
            if (receipt.status === 1) {
                setReCall((prev) => prev + 1);
                notify.complete(toastId, `tokens rescued successfully`);
                return receipt;
            }
        } catch (error) {
            const { message: errorMessage, code: errorCode } = handleTransactionError(error, "rescuing token");
            if (errorCode === "ACTION_REJECTED") {
                notify.reject(toastId, `Transaction rejected by user`);
                return null;
            }

            console.error(errorMessage);
            notify.fail(
                toastId, "Failed to rescue tokens,please try again",
            )
            return null;
        }
    }

    const formatAddress = (address) => {
        if (!address) return "";
        return `${address.substring(0, 6)}....${address.substring(address.length - 4)}`;
    }

    const formatTokenAmount = (amount, decimal = 18) => {
        if (!amount) return "0";
        return ethers.utils.formatUnits(amount, decimal);
    }

    const isOwner = async () => {
        if (!contract || !address) return false;
        try {
            const ownerAddress = await contract.owner();
            return ownerAddress.toLowerCase() === address.toLowerCase();
        } catch (error) {
            const errrorMessage = handleTransactionError(errror, "withdraw tokens");
            console.log(errrorMessage);
            return false;
        }
    }

    const addtokenToMetaMask = async () => {
        toastId = notify.start(`Adding ${TOKEN_SYMBOL} to Metamask...`);
        try {
            const wasAdded = await window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: LINKTUN_ADDRESS,
                        symbol: TOKEN_SYMBOL,
                        decimals: TOKEN_DECIMAL,
                        image: TOKEN_LOGO,
                    },
                },
            })

            if (wasAdded) {
                notify.complete(toastId, `successfully added ${TOKEN_SYMBOL} to Metamask`);
            } else {
                notify.complete(toastId, `failed to add ${TOKEN_SYMBOL} to Metamask`);
            }
        } catch (error) {
            console.error(error);
            const { message: errorMessage, code: errorCode } = handleTransactionError(error, "token adding error");

            notify.fail(toastId, `transaction failed,${errorMessage.message === "undefined" ? "not supported" : errorMessage.message}`);

        }
    }

    const value = {
        provider,
        signer,
        contract,
        account: address,
        chainId,
        isConnected: !!address && !!contract,
        isConnecting,
        contractInfo,
        error,
        tokenBalance,
        reCall,
        globalLoad,
        buyToken,
        updateTokenPrice,
        setSaleToken,
        withdrawAllTokens,
        rescueToken,
        formatAddress,
        formatTokenAmount,
        addtokenToMetaMask,
        isOwner,
        setReCall,
    }

    return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
}



export const useWeb3 = () => {
    const context = useContext(Web3Context);
    if (context === undefined) {
        throw new Error("useWeb3 must be used within a Web3Provider");
    }
    return context;
}

export default Web3Context;