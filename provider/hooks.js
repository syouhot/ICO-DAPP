import { providers } from "ethers"
import { useMemo } from "react"
import { useClient, useConnectorClient } from "wagmi"


export function clientTopprovider(client) {
    const { chain, transport } = client
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address
    }
    if (transport.type == "fallback") {
        return new providers.FallbackProvider(
            transport.transports.map(
                ({ value }) => new providers.JsonRpcProvider(value?.url, network)
            )
        )
    }
    return new providers.JsonRpcProvider(transport.url, network);
}


export function useEthersProvider({ chainId } = {}) {
    const client = useClient({chainId})
    
    return useMemo(() => {
        return client?clientTopprovider(client):undefined
    },[client])
}

export function clientToSigner(client){
    const { account, chain, transport } = client;
    const network = {
        chainId:chain.id,
        name:chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address
    }
    const provider = new providers.Web3Provider(transport, network);

    const signer = provider.getSigner(account.address);
    return signer;
}

export function useEthersSigner({ chainId } = {}) {
    const { data: client } = useConnectorClient({ chainId })
    return useMemo(() => {
        return client ? clientToSigner(client) : undefined
    },[client])
}