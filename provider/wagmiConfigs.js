import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowKit"

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

export const config = getDefaultConfig({
    appName:"LINKTUM AI",
    projectId: projectId,
    chains: [sepolia],
    ssr: true,
    
})