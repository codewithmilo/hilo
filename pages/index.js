import { useEffect, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { providers } from "ethers";

import { Container, Text, Spacer, Grid } from "@nextui-org/react";
import { TokenCard } from "../components/buttons";

import { getWalletError } from "../lib/errors";
import { CONSTANTS } from "../lib/constants";
import { getGameState, setupGameEvents } from "../lib/contract";

let web3Modal;
if (typeof window !== "undefined") {
  web3Modal = new Web3Modal({
    network: CONSTANTS.CHAIN_NAME,
    providerOptions: {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          rpc: {
            80001: "https://rpc-mumbai.maticvigil.com",
            137: "https://polygon-rpc.com",
          },
        },
      },
    },
    theme: "dark",
    cacheProvider: true,
  });
}

const Modals = {
  HOW_TO_PLAY: 0,
  APPROVE: 1,
  BUY: 2,
  SELL: 3,
};

const PageState = {
  UNLOADED: 0,
  NO_WALLET: 1,
  READY: 2,
  OVER: 3,
};

export default function Home() {
  const [pageState, setPageState] = useState(PageState.UNLOADED);

  // the wallet provider
  const [wallet, setWallet] = useState(null);
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);

  const [gameState, setGameState] = useState(null);
  const [modalVisible, setModalVisible] = useState(false); // Modal type
  const [walletError, setWalletError] = useState(null);
  const [priceUpdated, setPriceUpdated] = useState(null); // this is which token was updated, so HI or LO

  const connectWallet = async () => {
    await web3Modal
      .connect()
      .then(async (instance) => {
        const library = new providers.Web3Provider(instance);
        const accounts = await library.listAccounts();
        const network = await library.getNetwork();

        setWallet(instance);
        if (accounts) setAccount(accounts[0]);

        // // make sure we're on polygon
        if (network.chainId !== CONSTANTS.CHAIN_ID) {
          web3Modal.clearCachedProvider();
          throw new Error("bad_chain");
        }

        // otherwise it ok
        setProvider(library);
        setPageState(PageState.READY);
      })
      .catch((err) => setWalletError(getWalletError(err)));
  };

  const updateGameState = async () => {
    getGameState(provider)
      .then((res) => setGameState(res.result))
      .then(setPageState(PageState.READY));
  };

  // When the page loads: try to connect wallet (or show connect button)
  useEffect(() => {
    if (web3Modal.cachedProvider) {
      connectWallet();
    } else {
      // we can show the page, there's no wallet
      setPageState(PageState.NO_WALLET);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When we have a wallet, setup wallet events
  useEffect(() => {
    if (!wallet) return;

    // HANDLE WALLET CHANGES
    const handleAccountsChanged = (accounts) => {
      console.log("accountsChanged", accounts);
      if (!accounts.length) {
        // this is effectively a disconnect
        (async function () {
          await web3Modal.clearCachedProvider();
        })();
      }
      window.location.reload();
    };
    const handleChainChanged = (chainId) => {
      console.log("chainChanged", chainId);
      // ethers said to just do this. fair!
      window.location.reload();
    };

    const handleDisconnect = () => {
      (async function () {
        await web3Modal.clearCachedProvider();
      })();
      window.location.reload();
    };

    wallet.on("accountsChanged", handleAccountsChanged);
    wallet.on("chainChanged", handleChainChanged);
    wallet.on("disconnect", handleDisconnect);

    return () => {
      if (wallet.removeListener) {
        wallet.removeListener("accountsChanged", handleAccountsChanged);
        wallet.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [wallet, account, provider]);

  // When we have a wallet connected, set up the game
  useEffect(() => {
    if (!wallet) return;

    updateGameState()
      .then(
        setupGameEvents(provider, account, updateGameState, setPriceUpdated)
      )
      .then(() => {
        if (gameState.winners.length > 0) {
          setPageState(PageState.OVER);
        } else {
          setPageState(PageState.READY);
        }
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  if (pageState === PageState.UNLOADED) return null;

  return (
    <>
      <Head>
        <title>HILO</title>
        <link rel="icon" href="/img/hilo.png" />
      </Head>
      <Container fluid css={{ minHeight: "100vh", position: "relative" }}>
        <Text h1 size="8rem" className={styles.title}>
          HiLo
        </Text>
        <Text
          className={styles.howTo}
          onClick={() => setModalVisible(Modals.HOW_TO_PLAY)}
        >
          How to play
        </Text>

        <HiloModal
          type={modalVisible}
          close={() => setModalVisible(false)}
          provider={provider}
        />

        {/* NO WALLET */}
        {pageState === PageState.NO_WALLET && (
          <>
            <Text size="3rem" className={styles.subtitle}>
              A Game of Tokens
            </Text>
            <WalletError error={walletError} />
            <Spacer y={10} />
            <ConnectButton wallet={wallet} connectWallet={connectWallet} />
          </>
        )}

        {/* GAME OVER */}
        {pageState === PageState.OVER && (
          <>
            <Text size="3rem" className={styles.subtitle}>
              A Game of Tokens
            </Text>
            <Text h1 size="15vw" className={styles.gameOver}>
              GAME OVER
            </Text>
            <Winners winners={gameState.winners} player={account} />
          </>
        )}

        {/* GAME READY */}
        {pageState === PageState.READY && (
          <>
            {/* Show the player */}
            <Player account={account} />
            <Spacer y={1} />
            <PlayerTotals totals={gameState.playerTotals} />
            <Spacer y={1} />
            <Balances balances={gameState.tokenBalances} />
            <Spacer y={1} />

            {/* If we get a price updated event, show the banner at the top */}
            <PriceUpdatedBanner
              updatedToken={priceUpdated}
              close={() => setPriceUpdated(null)}
            />

            {/* Show the two tokens */}
            <Grid.Container gap={1} justify="center">
              <Grid xs={6} sm={6} md={4}>
                <TokenCard
                  type={CONSTANTS.HI_TOKEN_NAME}
                  tokenId={CONSTANTS.HI_TOKEN_ID}
                  gameState={gameState}
                />
              </Grid>
              <Grid xs={6} sm={6} md={4}>
                <TokenCard
                  type={CONSTANTS.LO_TOKEN_NAME}
                  tokenId={CONSTANTS.LO_TOKEN_ID}
                  gameState={gameState}
                />
              </Grid>
            </Grid.Container>

            {/* If payment is not approved, show the button */}
            <Spacer y={1} />
            <ApproveButton
              gameState={gameState}
              onClick={() => setModalVisible(Modals.APPROVE)}
            />
          </>
        )}
      </Container>
    </>
  );
}
