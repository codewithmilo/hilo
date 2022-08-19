import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { providers } from "ethers";

import {
  GameState,
  PageState,
  Modals,
  Tokens,
  SolidityError,
} from "../lib/types";

import HiloModal from "../components/modals/HiloModal";
import ErrorBanner from "../components/ErrorBanner";
import ConnectButton from "../components/buttons/ConnectButton";
import ApproveButton from "../components/buttons/ApproveButton";
import PriceUpdate from "../components/PriceUpdate";
import TokenCard from "../components/TokenCard";
import {
  Balances,
  Player,
  PlayerTotals,
  Winners,
} from "../components/playerInfo";

import { Container, Text, Spacer, Grid } from "@nextui-org/react";

import { getWalletError } from "../lib/errors";
import { CONSTANTS } from "../lib/constants";
import { getGameState, setupGameEvents } from "../lib/contract";

let web3Modal: Web3Modal;
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

export default function Home() {
  const [pageState, setPageState] = useState<PageState>(PageState.UNLOADED);

  // the wallet provider
  const [wallet, setWallet] = useState<any | null>(null);
  const [provider, setProvider] = useState<providers.Web3Provider | null>(null);
  const [account, setAccount] = useState<string | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [modalVisible, setModalVisible] = useState<Modals | null>(undefined);
  const [tokenAction, setTokenAction] = useState<Tokens | null>(null);

  const [walletError, setWalletError] = useState<string>(null);
  const [priceUpdated, setPriceUpdated] = useState<Tokens>(null);

  ////////////////////////////////////////////////////////////////////////////////
  //                                                                            //
  //      PAGE LOAD: CONNECT WALLET / SETUP GAME / CREATE EVENT LISTENERS       //
  //                                                                            //
  ////////////////////////////////////////////////////////////////////////////////

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
        web3Modal.clearCachedProvider();
      }
      window.location.reload();
    };
    const handleChainChanged = (chainId: number) => {
      console.log("chainChanged", chainId);
      // ethers said to just do this. fair!
      window.location.reload();
    };

    wallet.on("accountsChanged", handleAccountsChanged);
    wallet.on("chainChanged", handleChainChanged);

    return () => {
      if (wallet.removeListener) {
        wallet.removeListener("accountsChanged", handleAccountsChanged);
        wallet.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [wallet, provider, account]);

  // When we have a wallet connected, set up the game
  useEffect(() => {
    if (!provider) return;

    updateGameState()
      .then((state: GameState) => {
        setupGameEvents(provider, account, updateGameState, showPriceUpdate);

        if (state.winners.length > 0) {
          setPageState(PageState.OVER);
        } else {
          setPageState(PageState.READY);
        }
      })
      .catch((error: SolidityError) => {
        console.log(error);
        setWalletError(getWalletError(error));
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  ////////////////////////////////////////////////////////////////////////////////
  //                                                                            //
  //                          APPLICATION METHODS!                              //
  //                                                                            //
  ////////////////////////////////////////////////////////////////////////////////

  const connectWallet = async () => {
    await web3Modal
      .connect()
      .then(async (instance: any) => {
        const library = new providers.Web3Provider(instance);
        const accounts = await library.listAccounts();
        const network = await library.getNetwork();

        setWallet(instance);
        console.log(accounts);
        if (accounts) setAccount(accounts[0]);

        if (network.chainId !== CONSTANTS.CHAIN_ID) {
          console.log("bad chain");
          setPageState(PageState.NO_WALLET);
          throw new Error("bad_chain");
        }

        setProvider(library);
      })
      .catch((err) => setWalletError(getWalletError(err)));
  };

  const updateGameState = async () => {
    const state = await getGameState(provider, account);
    setGameState(state);
    setPageState(PageState.READY);
    return state;
  };

  const showPriceUpdate = (token: Tokens) => {
    setPriceUpdated(token);
  };

  const handleTokenAction = (token: Tokens, action: "buy" | "sell") => {
    setTokenAction(token);
    const modal = action === "buy" ? Modals.BUY : Modals.SELL;
    setModalVisible(modal);
  };

  useEffect(() => {
    if (modalVisible === null) {
      updateGameState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalVisible]);

  ////////////////////////////////////////////////////////////////////////////////
  //                                                                            //
  //                            PAGE RENDERING!                                 //
  //                                                                            //
  ////////////////////////////////////////////////////////////////////////////////

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
          show={modalVisible === Modals.HOW_TO_PLAY}
          modalType={modalVisible}
          closeFn={() => setModalVisible(null)}
          provider={provider}
        />

        {/* NO WALLET */}
        {pageState === PageState.NO_WALLET && (
          <>
            <Text size="3rem" className={styles.subtitle}>
              A Game of Tokens
            </Text>
            <ErrorBanner error={walletError} closeFn={null} />
            <Spacer y={10} />
            {!wallet && <ConnectButton connectFn={connectWallet} />}
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
            <Player player={account} />
            <Spacer y={1} />
            <PlayerTotals totals={gameState.playerTotals} />
            <Spacer y={1} />
            <Balances balances={gameState.tokenBalances} />
            <Spacer y={1} />

            {/* If we get a price updated event, show the banner at the top */}
            <PriceUpdate
              token={priceUpdated}
              closeFn={() => setPriceUpdated(null)}
            />

            {/* Show the two tokens */}
            <Grid.Container gap={1} justify="center">
              <Grid xs={6} sm={6} md={4}>
                <TokenCard
                  tokenType={Tokens.HI}
                  price={gameState.currentHi}
                  buyFn={() => handleTokenAction(Tokens.HI, "buy")}
                  sellFn={() => handleTokenAction(Tokens.HI, "sell")}
                  balance={gameState.tokenBalances[Tokens.HI]}
                />
              </Grid>
              <Grid xs={6} sm={6} md={4}>
                <TokenCard
                  tokenType={Tokens.LO}
                  price={gameState.currentLo}
                  buyFn={() => handleTokenAction(Tokens.LO, "buy")}
                  sellFn={() => handleTokenAction(Tokens.LO, "sell")}
                  balance={gameState.tokenBalances[Tokens.LO]}
                />
              </Grid>
              <HiloModal
                show={modalVisible === Modals.BUY}
                modalType={modalVisible}
                closeFn={() => setModalVisible(null)}
                provider={provider}
                token={tokenAction}
                gameState={gameState}
              />
              <HiloModal
                show={modalVisible === Modals.SELL}
                modalType={modalVisible}
                closeFn={() => setModalVisible(null)}
                provider={provider}
                token={tokenAction}
                gameState={gameState}
              />
            </Grid.Container>

            {/* If payment is not approved, show the button */}
            <Spacer y={1} />
            <ApproveButton
              gameState={gameState}
              clickFn={() => setModalVisible(Modals.APPROVE)}
            />
            <HiloModal
              show={modalVisible === Modals.APPROVE}
              modalType={modalVisible}
              closeFn={() => setModalVisible(null)}
              provider={provider}
            />
          </>
        )}
      </Container>
    </>
  );
}
