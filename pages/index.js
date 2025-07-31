import React, { useEffect, useState } from "react";
import Head from "next/head";
import { Header, HeroSection,Footer } from "../components/HomePage/index"

const TOKEN_NAME = process.env.NEXT_PUBLIC_TOKEN_NAME
export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saveMode = localStorage.getItem("darkMode")
      let systemPreferdark = false;
      try {
        systemPreferdark = window.matchMedia("{prefers-color-scheme: dark}").matches;
      } catch (error) { }
      const shouldUseDarkMode = saveMode === "false" ? false : true

      setIsDarkMode(shouldUseDarkMode)
      if (shouldUseDarkMode) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    } catch (error) {
      console.error("Error initializing theme:", error);
      setIsDarkMode(true)
    }
  })

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    applyTheme(newMode)
    try {
      localStorage.setItem("darkMode", newMode.toString())
    } catch (error) {
      console.error("Error Saving theme preference");

    }
  }
  const applyTheme = (dark) => {
    if (typeof document === "undefined") return;
    if (dark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }


  return <div className={`min-h-screen ${isDarkMode ? "bg-black text-white" : "bg-white text-gray-800"} transition-colors duration-300`}>
    <Head>
      <title>{TOKEN_NAME} Bridging AI with Decentralization</title>
      <meta name="description" content="Token ico dapp"></meta>
      <link rel="stylesheet" href="/logo.png"></link>
    </Head>
    <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode}></Header>
    <main>
      <HeroSection isDarkMode={isDarkMode}></HeroSection>
    </main>
    <Footer isDarkMode={isDarkMode}/>
  </div>;
};

