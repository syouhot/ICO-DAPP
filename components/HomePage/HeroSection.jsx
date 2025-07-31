import React, { useState, useEffect, useMemo, useRef } from "react";
import { FaEthereum } from "react-icons/fa";
import { SiTether } from "react-icons/si";
import { IoWalletOutline } from "react-icons/io5";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { BsFillInfoCircleFill, BsCurrencyDollar } from "react-icons/bs";
import { RiUsdCircleFill } from "react-icons/ri";

import { CustomConnectButton } from "../index"
import { useWeb3 } from "../../context/Web3Provider"
import { ethers } from "ethers"

import { useEthersProvider } from "../../provider/hooks";
import TOKEN_ICO_ABI from "../../context/ABI.json";

const TOKEN_NAME = process.env.NEXT_PUBLIC_TOKEN_NAME;
const TOKEN_SYMBOL = process.env.NEXT_PUBLIC_TOKEN_SYMBOL;
const TOKEN_SUPPLY = process.env.NEXT_PUBLIC_TOKEN_SUPPLY;
const PER_TOKEN_USD_PRICE = process.env.NEXT_PUBLIC_PER_TOKEN_USD_PRICE;
const NEXT_PER_TOKEN_USD_PRICE =
  process.env.NEXT_PUBLIC_NEXT_PER_TOKEN_USD_PRICE;
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY;
const BLOCKCHAIN = process.env.NEXT_PUBLIC_BLOCKCHAIN;
const LINKTUN_ADDRESS = process.env.NEXT_PUBLIC_LINKTUN_ADDRESS;

const HeroSection = ({ isDarkMode, setIsReferralPopupOpen }) => {
  const {
    account,
    isConnected,
    contractInfo,
    tokenBalance,
    buyToken,
    addtokenToMetaMask,
    setSaleToken,
  } = useWeb3();


  const [selectedToken, setSelectedToken] = useState("ETH");
  const [inputAmount, setInputAmount] = useState("0");
  const [tokenAmount, setTokenAmount] = useState("0");
  const [hasSufficientBalance, setHasSufficientBalance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAttemptedRegistration, setHasAttemptedRegistration] = useState(false);

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  const setToken = () => {
    setSaleToken(LINKTUN_ADDRESS)
  }
  const provider = useEthersProvider();
  const getInfo = async () => {
    const result = await provider.getCode("0x5FbDB2315678afecb367f032d93F642f64180aa3")
    console.log(result, 33333);

    // const readonlyContract = new ethers.Contract(
    //   "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    //   TOKEN_ICO_ABI.abi,
    //   provider
    // )
    // const info = await readonlyContract.getContractInfo();
    // console.log(info);
  }

  const calculateProcessPercentage = () => {
    if (!contractInfo.totalSold || !contractInfo.tbcBalance) {
      return 0;
    }

    //字符串转数字
    const totalSold = parseFloat(contractInfo.totalSold);
    const tbcBalance = parseFloat(contractInfo.tbcBalance);
    //计算总供应量(sold +available balance)
    const totalSupply = totalSold + tbcBalance;
    const percentage = (totalSold / totalSupply) * 100;
    //百分比
    return isNaN(percentage) ? 0 : Math.min(parseFloat(percentage.toFixed(2)), 100);

  };
  //代币价格
  const prices = useMemo(() => {
    const defaultEthPrice = contractInfo?.ethPrice;

    let ethPrice;
    try {
      if (contractInfo?.ethPrice) {
        if (typeof contractInfo.ethPrice === "object" && contractInfo.ethPrice._isBigNumber) {
          ethPrice = contractInfo.ethPrice;
        } else {
          ethPrice = ethers.utils.parseEther(contractInfo.ethPrice.toString());
        }        
      } else {
        ethPrice = ethers.utils.parseEther(defaultEthPrice);
      }
    } catch (error) {
      console.error("Error parsing prices", error);
      ethPrice = ethers.utils.parseEther(defaultEthPrice);
    }

    return { ethPrice }
  }, [contractInfo])

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !tokenBalance) {
      setHasSufficientBalance(false)
      return
    }

    //检查代币达到阈值
    const lowTokenSupply = parseFloat(tokenBalance?.tbcBalance || "0") < 20;
    if (lowTokenSupply) {
      setHasSufficientBalance(false);
      return;
    }
    const inputASmountFloat = parseFloat(inputAmount) || 0;
    let hasBalance = false;
    switch (selectedToken) {
      case "ETH":
        const ethBalance = parseFloat(tokenBalance?.userEthBalance || "0");
        hasBalance = ethBalance >= inputASmountFloat && inputASmountFloat > 0;
        break;
      default:
        hasBalance = false;
    }
    setHasSufficientBalance(hasBalance);
  }, [isConnected, inputAmount, selectedToken, tokenBalance])

  //根据输入金额计算代币数量
  const calculateTokenAmount = (amount, token) => {
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return "0";

    let calculatedAmount;
    try {
      switch (token) {
        case "ETH":
          const amountInWei = ethers.utils.parseEther(amount);
          const tokenPerEth = ethers.utils.formatEther(prices.ethPrice.toString());
          console.log(tokenPerEth, "tokenPerEth");
          
          calculatedAmount = parseFloat(amount) / parseFloat(tokenPerEth);
          break;
        default:
          calculatedAmount = 0;
      }
    } catch (error) {
      console.error("Error calculating token amount", error);
      calculatedAmount = 0;
    }
    return calculatedAmount.toFixed(2);
  };

  //处理输入金额变化
  const handleAmountChange = (value) => {
    setInputAmount(value);
    setTokenAmount(calculateTokenAmount(value, selectedToken));
  }
  //处理代币选择变化
  const handleTokenSelection = (token) => {
    setSelectedToken(token);
    setTokenAmount(calculateTokenAmount(inputAmount, token));
  }

  //处理购买代币
  const executePurchase = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }
    if (parseFloat(inputAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!hasSufficientBalance) {
      if (parseFloat(tokenBalance?.tbcBalance || "0") < 20) {
        alert("Insufficient balance to buy tokens. Please try again later.");
      } else {
        alert(`Insufficient ${selectedToken} balance to buy tokens.`);
      }
      return;
    }

    try {
      let tx;
      console.log(`buying with ${inputAmount} ${selectedToken}...`);
      switch (selectedToken) {
        case "ETH":
          tx = await buyToken(inputAmount);
          break;
        default:
          alert("Please select a token to purchase with");
          return;
      }
      console.log(`Successfully purchased ${tokenAmount} ${TOKEN_SYMBOL} tokens`);
      //重制输入
      setInputAmount("0");
      setTokenAmount("0");
    } catch (error) {
      console.error(`Error buying with ${selectedToken}:`, error);
      alert("Transaction failed.Please try again");
      
    }
  };

  //根据所选代币获取当前余额
  const getCurrentBalance = () => {
    if (!tokenBalance) return "0";
    switch (selectedToken) {
      case "ETH":
        return tokenBalance?.userEthBalance || "0";
      default:
        return "0";
    }
  }

  //确认按钮
  const getButtonMessage = () => {
    if (inputAmount === "0" || inputAmount === "") {
      return "Enter amount";
    }
    if (parseFloat(tokenBalance?.tbcBalance || "0") < 20) {
      return "INSUFFICIENT TOKEN SUPPLY";
    }
    return hasSufficientBalance ? `BUY ${TOKEN_SYMBOL}` : `INSUFFICIENT ${selectedToken} BALANCE`;
  }

  //获取代币图标
  const getTokenIcon = (token) => {
    switch (token) {
      case "ETH":
        return <img src="/polygon.svg" className="w-5 h-5" alt="polygon" />;
      default:
        return null;
    }
  }

  //主题
  const bgColor = isDarkMode ? "bg-[#0e0b12]" : "gb-[#f5f7fa]";
  const textColor = isDarkMode ? "text-white" : "text-gray-800";
  const seconddaryTextColor = isDarkMode ? "text-gray-400" : "text-gray-600";
  const cardBg = isDarkMode ? "bg-[#13101a]" : "bg-white/95";
  const cardBorder = isDarkMode ? "border-gray-800/30" : "border-gray-100";
  const inputBg = isDarkMode ? "bg-gray-900/60 border-gray-800/50" : "bg-gray-100 border-gray-200/70";
  const primaryGradient = "from-fuchsia-600 to-purple-700"
  const primaryGradientButton = "from-fuchsia-600 to-pruple-700";
  const accentColor = "text-[#7765f3]";

  const getTokenButtonStyle = (token) => {
    const isSelected = selectedToken === token;
    const baseClasses = "flex-1 flex items-center justify-center rounded-lg py-2.5 transition-all duration-300"

    if (isSelected) {
      let selectedColorClass;
      switch (token) {
        case "ETH":
          selectedColorClass = "bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700";
          break;
        default:
          selectedColorClass = "";
      }
      return `${baseClasses} ${selectedColorClass} text-white shadow-lg`;
    }

    return `${baseClasses} ${isDarkMode ?
      "bg-gray-800/40 hover:bg-gray-800/60 text-gray-300" :
      "bg-gray-200 hover:bg-gray-300 text-gray-700"}`
  }

  //粒子动画效果
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const particleCount = 70;
    const baseColor = { r: 189, g: 38, b: 211 } //#bd26d3;
    //设置容器尺寸
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    //鼠标交互
    let mouseX = 0
    let mouseY = 0;
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }
    window.addEventListener("mousemove", handleMouseMove);

    const perspective = 400;
    const focalLength = 300;
    //初始化
    particlesRef.current = Array(particleCount)
      .fill()
      .map(() => ({
        x: Math.random() * canvas.width - canvas.width / 2,
        y: Math.random() * canvas.height - canvas.height / 2,
        z: Math.random() * 1000,
        size: Math.random() * 4 + 2,
        baseSize: Math.random() * 4 + 2,
        speedX: Math.random() * 0.5 - 0.25,
        speedY: Math.random() * 0.5 - 0.25,
        speedZ: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.3,
      }))

    //动画
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sortedParticles = [...particlesRef.current].sort((a, b) => a.z - b.z)
      sortedParticles.forEach((particle) => {
        const mouseInfluenceX = (mouseX - canvas.width / 2 - particle.x) * 0.0001;
        const mouseInfluenceY = (mouseY - canvas.height / 2 - particle.y) * 0.0001;

        //更新粒子位置
        particle.x += particle.speedX + mouseInfluenceX;
        particle.y += particle.speedY + mouseInfluenceY;
        particle.z -= particle.speedZ;
        //如果粒子在后面,则需要重制位置
        if (particle.z <= -focalLength) {
          particle.z = Math.random() * 1000;
          particle.x = Math.random() * canvas.width - canvas.width / 2;
          particle.y = Math.random() * canvas.height - canvas.height / 2;
        }

        const scale = focalLength / (focalLength + particle.z);
        const x2d = particle.x * scale + canvas.width / 2;
        const y2d = particle.y * scale + canvas.height / 2;
        const scaledSize = particle.baseSize * scale;

        //根据深度计算颜色
        const distance = 1 - Math.min(particle.z / 1000, 1);
        const opacity = particle.opacity * distance;
        //应用颜色深度
        const colorVariation = Math.max(0.6, distance);
        const r = Math.floor(baseColor.r * colorVariation);
        const g = Math.floor(baseColor.g * colorVariation);
        const b = Math.floor(baseColor.b * colorVariation);

        ctx.beginPath();
        ctx.arc(x2d, y2d, scaledSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.fill();

        if (distance > 0.8) {
          ctx.beginPath();
          ctx.arc(x2d, y2d, scaledSize * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`;
          ctx.fill();
        }
      })

      animationRef.current = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isDarkMode]);

  return (
    <div className={`relative mt-12 w-full overflow-hidden ${bgColor}`}>
      <div className="absolute inset-0 z-0">
        <div className={`absolute inset-0 ${isDarkMode ? "bg-gradient-to-b from-[#0e0b12]/80 via-transparent to-[#0e0b12]/80"
          : "bg-gradient-to-b from-[#f3f3f7]/80 via-transparent to-[#f3f3f7]/80"}`}></div>
        <canvas ref={canvasRef} className="w-full h-full absolute top-0 left-0 pointer-events-none z-10" style={{ zIndex: 1 }}></canvas>
        <div className="absolute inset-0 grid-pattern"></div>
        <div className="absolute inset-0 light-rays">
          <div className="light-ray ray1"></div>
          <div className="light-ray ray2"></div>
          <div className="light-ray ray3"></div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-28 md:py-32 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-16">
          <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="inline-block p-2 px-4 rounded-full bg-gradient-to-r from-teal-400/10 to-indigo-500/10 mb-6">
              <p className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 to-purple-600 animate-gradient-x">
                Preasle Now Live
              </p>
              {/* <button onClick={() => setToken()}>SET TOKEN</button>
              <div>
              <button onClick={() => getInfo()}>GET TOKEN</button>
              </div> */}
            </div>
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold ${textColor} mb-4`}>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 to-purple-600 animate-gradient-x">
                {TOKEN_NAME}
              </span>
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 to-purple-600 animate-gradient-x">
                Token
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                {" "}
                Sale
                {" "}
              </span>
              <span className={textColor}>Stage 1</span>
            </h2>
            <p className={`${seconddaryTextColor} text-base md:text-lg max-w-md mb-8 leading-relaxed`}>
              Revolutionizing intelligence through decentralized innovation
              Join the future of blockchain technology today
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <div className={`px-4 py-2 rounded-full ${isDarkMode ? "bg-teal-500/10" : "bg-teal-100"} 
                ${isDarkMode ? "text-fuchsia-500" : "text-teal-700"} text-sm font-medium flex items-center`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Limited Presale
              </div>
              <div className={`px-4 py-2 rounded-full ${isDarkMode ? "bg-indigo-500/10" : "bg-indigo-100"} 
                ${isDarkMode ? "text-indigo-300" : "text-indigo-700"} text-sm font-medium flex items-center`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Exclusive Benefits
              </div>
            </div>

            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-r from-teal-400/10 to-indigo-500/10 rounded-full blur-3xl -z-10"></div>
          </div>
          {/* 右侧 */}
          <div className="w-full md:w-1/2 max-w-md mx-auto relative">
            {isLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                </div>
              </div>
            )}

            {/* 卡片 */}
            <div className={`${cardBg} backdrop-blur-sm rounded-xl ${cardBorder} border shadow-xl overflow-hidden transform transition duration-500 hover:shadow-2xl`}>
              <div className="p-6 md:p-8">
                {(!tokenBalance?.userEthBalance || Number(tokenBalance.userEthBalance) === 0) && (
                  <div className={`text-center text-xs ${seconddaryTextColor} mb-4 bg-gradient-to-r from-teal-400/5 to-indigo-500/5 py-2 px-4 rounded-lg`}>
                    Can`t find tokens in your wallet?
                  </div>
                )}
                {/* 卡片头 */}
                <div className="text-center">
                  <div className="inline-block p-1.5 px-3 rounded-full bg-gradient-to-r from-teal-400/10 to-indigo-500/10 mb-2 ">
                    <p className="text-xs font-medium bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 to-purple-600 animate-gradient-x">
                      Limited Time Offer
                    </p>
                  </div>
                  <h3 className="text-xl text-center font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 to-purple-600 animate-gradient-x">
                    Stage 1 - Buy {TOKEN_SYMBOL} Now
                  </h3>
                  <div className={`text-center text-sm ${seconddaryTextColor} mb-4`}>
                    Until price increase
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm mb-3 px-1">
                  <div className={`${seconddaryTextColor} flex flex-col`}>
                    <span className="text-xs mb-1">Current Price</span>
                    <span className={`${textColor} font-medium`}>
                      {PER_TOKEN_USD_PRICE} {CURRENCY}
                    </span>
                  </div>
                  <div className="h-10 w-px bg-gradient-to-b from-transparent via-gray-500/20 to-transparent"></div>
                  <div className={`${seconddaryTextColor} flex flex-col text-right`}>
                    <span className="text-xs mb-1">Next Stage Price</span>
                    <span className={`${textColor} font-medium`}>
                      {NEXT_PER_TOKEN_USD_PRICE} {CURRENCY}
                    </span>
                  </div>
                </div>
                {/* progress bar */}
                <div className={`w-full h-4 ${isDarkMode ? "bg-gray-800/70" : "bg-gray-200/70"} rounded-full mb-3 overflow-hideen`}>
                  <div className={`h-full rounded-full bg-gradient-to-r ${primaryGradient} animated-progress relative`} style={{ width: `${Math.max(0.5, calculateProcessPercentage())}%` }}
                    key={`progress-${calculateProcessPercentage()}`}>
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 shimmer-effect"></div>
                  </div>
                </div>
                {/* 进度状态 */}
                <div className="flex justify-between text-xs mb-6 px-1">
                  <div className={seconddaryTextColor}>
                    Total Raised:{" "}
                    <span className={`${textColor} font-medium`}>
                      {" "}
                      {parseFloat(contractInfo?.totalSold || 0) *
                        parseFloat(PER_TOKEN_USD_PRICE || 0) > 0 ?
                        (
                          parseFloat(contractInfo?.totalSold || 0) *
                          parseFloat(PER_TOKEN_USD_PRICE || 0)
                        ).toFixed(2)
                        : "0"}{" "}
                      ETH
                    </span>
                  </div>
                  <div className={`${seconddaryTextColor} font-medium`}>
                    <span className="text-fuchsia-500 font-semibold">
                      {calculateProcessPercentage()}%
                    </span>
                    {" "}
                    Complete
                  </div>
                </div>
                {/* divider */}
                <div className={`border-t ${isDarkMode ? "border-gray-800/50" : "border-gray-200/50"} my-5`}></div>
                {/* 代币价格 */}
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-purple-600/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">1</span>
                  </div>
                  <span className={`${textColor} text-lg font-medium`}>
                    {TOKEN_SYMBOL} = {" "}
                  </span>
                  <div className="px-3 py-1 rounded-lg bg-gradient-to-r from-teal-400/10 to-indigo-500/10">
                    <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">
                      {PER_TOKEN_USD_PRICE} &nbsp; {CURRENCY}
                    </span>
                  </div>
                </div>
                {/* 代币选择 */}
                <div className="flex space-x-2 mb-4">
                  <button onClick={() => handleTokenSelection("ETH")} className={getTokenButtonStyle("ETH")}>
                    <img src="/polygon.svg" alt="ETH" className={`mr-2 w-4 h-4 ${selectedToken === "ETH" ? "filter brightness-200" : ""}`} />
                    Pay With {CURRENCY}
                  </button>
                </div>
                {/* 余额 */}
                <div className={`text-sm ${seconddaryTextColor} text-center mb-6 py-2 px-4 rounded-lg ${isDarkMode ? "bg-gray-800/30" : "bg-gray-100/70"}`}>
                  <span className="mr-2">{selectedToken} Balance:</span>
                  <span className={`${textColor} font-medium`}>
                    {getCurrentBalance()}
                  </span>
                  <span className="ml-1">
                    {selectedToken}
                  </span>
                </div>
                {/* 输入金额 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div className="">
                    <label htmlFor="" className={`block ${seconddaryTextColor} text-xs mb-1 font-medium`}>
                      Pay With {selectedToken}
                    </label>
                    <div className="relative">
                      <input type="text" value={inputAmount} onChange={(e) => handleAmountChange(e.target.value)}
                        className={`w-full ${inputBg} rounded-lg border px-4 py-3 ${textColor} focus:ring-1 focus:ring-teal-400 focus:border-teal-400 transition-all duration-200`} />
                      <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2`}>
                        <span className={`text-xs ${seconddaryTextColor}`}>
                          {selectedToken}
                        </span>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center">
                          {getTokenIcon(selectedToken)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="" className={`block ${seconddaryTextColor} text-xs mb-1 font-medium`}>
                      Receive {TOKEN_SYMBOL}
                    </label>
                    <div className="relative">
                      <input type="text" value={tokenAmount} readOnly className={`w-full ${inputBg} rounded-lg border px-4 py-3 ${textColor} `} />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                        <span className={`text-xs ${seconddaryTextColor}`}>
                          {TOKEN_SYMBOL}
                        </span>
                        <div className="w-6 h-6 flex items-center justify-center">
                          <img src="/logo.png" alt={TOKEN_SYMBOL} className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 按钮 */}
                {isConnected ? (
                  <>
                    <button onClick={executePurchase} disabled={!hasSufficientBalance}
                      className={`w-full ${hasSufficientBalance ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700" : isDarkMode ? "bg-gray-700/70 cursor-not-allowed" : "bg-gray-300 cursor-not-allowed"} text-white rounded-lg py-4 mb-4 flex items-center justify-center transition-all duration-300 font-medium shadow-lg ${hasSufficientBalance ? "hover:shadow-purple-500/20 hover:scale-[1.01]" : ""}`}>
                      {getButtonMessage()}
                    </button>
                    <button onClick={() => addtokenToMetaMask()} className={`w-full hidden lg:flex bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-lg py-4 mb-4 flex items-center justify-center transition-all duration-300 font-medium shadow-lg`}>
                      <img src="/logo.png" alt={TOKEN_SYMBOL} className="w-5 h-5" />
                      {" "}
                      &nbsp;
                      <span>Add Token to MetaMask</span>
                    </button>
                  </>
                ) : (
                  <CustomConnectButton childStyle="w-full mb-4 py-4 rounded-lg flex items-center justify-center gap-2 font-medium" />
                )}
                {/* 帮助链接 */}
                <div className="flex flex-col space-y-2 text-xs">
                  <div className={`p-3 rounded-lg ${isDarkMode ? "bg-gray-800/30" : "bg-gray-100/70"} mb-1`}>
                    <div className="flex items-center space-x-3 mb-2">
                      <AiOutlineQuestionCircle className={`text-lg text-[#7765f3]`} />
                      <h4 className={`font-medium ${textColor}`}>Need Help?</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a href={`/dashboard/`} className={`${seconddaryTextColor} hover:${textColor} flex items-center text-xs transition-colors duration-200 px-2 py-1 rounded hover:bg-gray-700/20`}>
                        <span className="mr-1">·</span>
                        How to Buy
                      </a>
                      <a href={`/dashboard/`} className={`${seconddaryTextColor} hover:${textColor} flex items-center text-xs transition-colors duration-200 px-2 py-1 rounded hover:bg-gray-700/20`}>
                        <span className="mr-1">·</span>
                        Wallet Connection
                      </a>
                      <a href="#TokenInfo" className={`${seconddaryTextColor} hover:${textColor} flex items-center text-xs transition-colors duration-200 px-2 py-1 rounded hover:bg-gray-700/20`}>
                        <span className="mr-1">·</span>
                        Token Info
                      </a>
                      <a href="#FAQ" className={`${seconddaryTextColor} hover:${textColor} flex items-center text-xs transition-colors duration-200 px-2 py-1 rounded hover:bg-gray-700/20`}>
                        <span className="mr-1">·</span>
                        FAQ
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 滚动到头部按钮 */}
      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 animate-gradient-x hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center transition-all duration-300 hover:scale-110`} aria-label="Scroll to top">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {/* 动画 */}
      <style jsx>
        {`
          @keyframes pulse-slow {
            0%,
            100% {
              opacity:0.8;
              transform:scale(1);
            }
            50% {
              opacity:1;
              transform:scale(1.02);
            }
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s infinite;
          }
          .animated-progress {
            animation:progress 1.5s ease-out;
          }
          @keyframes progress {
            0% {
              width: 0;
            }
            100% {
              width: ${Math.max(0.5, calculateProcessPercentage())}%; 
            }
          }
          .grid-pattern {
            background-image: ${isDarkMode ? "linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px),linear-gradient(90deg,rgba(56,189,258,0.06) 1px,transparent 1px)" : "linear-gradient(rgba(79,70,229,0.08) 1px, transparent 1px),linear-gradient(90deg,rgba(79,70,229,0.08) 1px,transparent 1px)"};
            background-size: 35px 35px;
            animation:pulse-grid 8s ease-in-out infinite alternate;
          }
          @keyframes pulse-grid {
            0%{
              opacity:0.7;
              background-size:35px 35px;
            }
            100%{
              opacity:1;
              background-sze:36px 36px;
            }
          }

          .light-rays {
            overflow:hidden;
            opacity:${isDarkMode ? "0.4" : "0.3"};
          }
          .light-ray{
            position:absolute;
            width:200%;
            height:100%;
            background: linear-gradient(90deg,transparent 0%,${isDarkMode ? "rgba(119,101,243,0.05) 45%,rgba(146,10,1,243,0.1) 50%,rgba(119,101,243,0.05) 55%" :
            "rgba(119,101,243,0.03) 45%,rgba(146,101,243,0.07) 50%,rgba(119,101,243,0.03) 55%"},
            transparent 100%
            );
            transform:rotate(45deg);
            top:-50%;
            left:-50%;
          }
          .ray1 {
              animation:moveRay 15s linear infinite;
          }
              
          .ray2 {
              animation:moveRay 20s linear 5s infinite;
          }
          .ray3 {
              animation:moveRay 25s linear 10s infinite;
          }
          @keyframes moveRay {
              0%{
                transform:rotate(45deg) translateX(-100%);
              }
              100%{
                transform:rotate(45deg) translateX(100%);
              }
          }

          .shimmer-effect{
              animation:shimmer 2s infinite linear;
              background:linear-gradient(
                to right,
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0.2) 50%,
                rgba(255,255,255,0) 100%
              );
              background-size:200% 100%;
          }
          
          @keyframes shimmer{
              0%{
                background-position:-200% 0;
              }
              100%{
                background-position:200% 0;
              }
          }
        `}
      </style>
    </div>
  )
}

export default HeroSection;
