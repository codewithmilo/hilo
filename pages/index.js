import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

import Web3Modal from "web3modal";
import { providers, Contract } from "ethers";

import abi from "../src/HILOToken.json";

const POLYGON_CHAIN_ID = 137;
const MUMBAI_CHAIN_ID = 80001;
const CHAIN_ID = MUMBAI_CHAIN_ID;

const HI_TOKEN_ID = 0;
const LO_TOKEN_ID = 1;

export default function Home() {
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);

  // updated prices of the tokens
  const [hiPrice, setHiPrice] = useState(0);
  const [loPrice, setLoPrice] = useState(0);

  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();

  const contractAddress = "0x4A2ad292A7989Cc10b64B8106d51776B5aC3BED0";
  const contractABI = abi.abi;

  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   *
   * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   *
   * A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Mumbai network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== CHAIN_ID) {
      window.alert("Change the network to Polygon");
      throw new Error("Change network to Polygon");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  /*
      connectWallet: Connects the wallet
    */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  const renderConnectButton = () => {
    if (walletConnected) {
      return <p>Wallet connected</p>;
    } else {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }
  };

  const getPrice = async (tokenId) => {
    try {
      if (walletConnected) {
        const provider = await getProviderOrSigner();

        /*
         * You're using contractABI here
         */
        const HILOContract = new Contract(
          contractAddress,
          contractABI,
          provider
        );

        let price = await HILOContract.getPrice(tokenId);
        console.log("Got price for tokenID %s: %s", tokenId, price.toNumber());
        if (tokenId === HI_TOKEN_ID) {
          setHiPrice(price.toNumber());
        } else {
          setLoPrice(price.toNumber());
        }
      } else {
        console.log("Wallet not connected!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "mumbai",
        providerOptions: {},
        disableInjectedProvider: false,
      });
    } else {
      // if wallet is connected, get the price of the tokens
      getPrice(HI_TOKEN_ID);
      getPrice(LO_TOKEN_ID);
    }
  }, [walletConnected]);

  return (
    <div className={styles.container}>
      <Head>
        <title>HILO</title>
        <meta name="description" content="HILO: A token game" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>HILO</h1>

        <p className={styles.description}>A game of tokens</p>

        <div className={styles.grid}>
          <a href="https://nextjs.org/docs" className={styles.card}>
            <h2>How to play</h2>
          </a>

          <div className={styles.card}>{renderConnectButton()}</div>

          <a
            href="https://github.com/vercel/next.js/tree/canary/examples"
            className={styles.card}
          >
            <h2>HI price:</h2>
            <p>{hiPrice}</p>
          </a>

          <a
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
          >
            <h2>LO price:</h2>
            <p>{loPrice}</p>
          </a>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          A MOLO production
        </a>
      </footer>
    </div>
  );
}
