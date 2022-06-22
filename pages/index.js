import { useEffect, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

import Web3Modal from "web3modal";
import { providers, Contract, utils } from "ethers";

import { Container, Text, Spacer, Grid, Card } from "@nextui-org/react";
import { HowToPlayModal } from "../components/modals";
import {
  renderPlayer,
  renderPlayerTotals,
  renderHoldings,
  renderWinners,
} from "../components/playerInfo";
import {
  renderErrorBanner,
  renderWalletErrorBanner,
  renderTradeBanner,
  renderApproveBanner,
  renderPriceUpdatedBanner,
} from "../components/banners";
import {
  renderConnectButton,
  renderApproveButton,
  TokenCard,
} from "../components/buttons";

import { GetErrorMsg, getWalletError, handleTxnError } from "../lib/errors";
import { CONSTANTS } from "../lib/constants";
import * as HILO from "../lib/contract";

import abi from "../src/HILO.json";

let web3Modal;
if (typeof window !== "undefined") {
  web3Modal = new Web3Modal({
    network: CONSTANTS.CHAIN_NAME,
    providerOptions: {},
    theme: "dark",
    cacheProvider: true,
  });
}

export default function Home() {
  // the wallet provider
  const [wallet, setWallet] = useState(null);
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);

  const [gameReady, setGameReady] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winners, setWinners] = useState([]);
  const [playerTotals, setPlayerTotals] = useState(null);

  // updated prices of the tokens
  const [hiPrice, setHiPrice] = useState(0);
  const [loPrice, setLoPrice] = useState(0);

  // keep track of whether the player has these tokens
  const [hasHi, setHasHi] = useState(false);
  const [hasLo, setHasLo] = useState(false);

  // detail modals, how to play and pre-approval description
  const [howToVisible, setHowToVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);

  // loading buttons
  const [hiBuyLoading, setHiBuyLoading] = useState(false);
  const [loBuyLoading, setLoBuyLoading] = useState(false);
  const [hiSellLoading, setHiSellLoading] = useState(false);
  const [loSellLoading, setLoSellLoading] = useState(false);
  const [approveButtonLoading, setApproveButtonLoading] = useState(false);

  // USDC approval banner
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [pendingApproveAmount, setPendingApproveAmount] = useState(0);
  const [approvalSuccess, setApprovalSuccess] = useState(false);

  // Buy/sell banners
  const [buySuccess, setBuySuccess] = useState(false);
  const [pendingTokenBuy, setPendingTokenBuy] = useState(null); // this becomes 0 or 1
  const [sellSuccess, setSellSuccess] = useState(false);
  const [pendingTokenSell, setPendingTokenSell] = useState(null); // this becomes 0 or 1
  const [priceUpdatedEvent, setPriceUpdatedEvent] = useState(null); // this becomes 0 or 1

  // errors
  const [error, setError] = useState(null);
  const [walletError, setWalletError] = useState(null);

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
      })
      .catch((err) => getWalletError(err, setWalletError));
  };

  // Pre-approve the contract to spend the user's USDC
  // Set at the highest possible amount in the game
  const preApprovePayments = async () => {
    setApproveButtonLoading(true);
    setApproveModalVisible(false);

    await HILO.approvePayments(
      CONSTANTS.MAX_APPROVAL_AMOUNT,
      provider,
      setPendingApproveAmount,
      setErrorAndClearLoading
    )
      .then(() => {
        setApproveButtonLoading(false);
        setPaymentApproved(true);
        setApprovalSuccess(true);
      })
      .catch((err) => setErrorAndClearLoading(err));
  };

  // returns nothing or the txn receipt
  const checkApprovalAndPossiblyApprove = async (tokenId) => {
    // add one if it's LO, in case the price updates while purchasing
    const amount = tokenId === CONSTANTS.LO_TOKEN_ID ? loPrice + 1 : hiPrice;
    const approved = await HILO.checkApproval(
      provider,
      setPaymentApproved,
      amount
    ).catch((err) => setErrorAndClearLoading(err));

    // nothing to do if already approved
    if (approved) return Promise.resolve();

    // otherwise we need to ask the user to approve the payment
    await HILO.approvePayments(
      amount,
      provider,
      setPendingApproveAmount,
      setErrorAndClearLoading
    );
  };

  // Buy a token
  const buyHandler = async (tokenId) => {
    const loadingFn =
      tokenId == CONSTANTS.HI_TOKEN_ID ? setHiBuyLoading : setLoBuyLoading;
    loadingFn(true);
    clearBanners();

    checkApprovalAndPossiblyApprove(tokenId)
      .then(() => {
        // unload then reload, so the loading animation lines up lol
        loadingFn(false);
        setPendingTokenBuy(tokenId);
        loadingFn(true);
        const signer = provider.getSigner();
        const HILOContract = new Contract(
          CONSTANTS.HILO_CONTRACT_ADDRESS,
          abi.abi,
          signer
        );
        return HILOContract.buy(tokenId);
      })
      .catch((err) => handleTxnError(err))
      .then((txn) => provider.waitForTransaction(txn.hash))
      .then((receipt) => {
        console.log("Bought tokenID %s", tokenId);
        console.log(receipt);

        setBuySuccess(true);
        tokenId == CONSTANTS.HI_TOKEN_ID
          ? setHiBuyLoading(false)
          : setLoBuyLoading(false);

        updateGameState();
      })
      .catch((err) => setErrorAndClearLoading(err));
  };

  // Sell a token
  const sellHandler = async (tokenId) => {
    tokenId == CONSTANTS.HI_TOKEN_ID
      ? setHiSellLoading(true)
      : setLoSellLoading(true);
    clearBanners();

    setPendingTokenSell(tokenId);
    const signer = provider.getSigner();
    const HILOContract = new Contract(
      CONSTANTS.HILO_CONTRACT_ADDRESS,
      abi.abi,
      signer
    );

    await HILOContract.sell(tokenId)
      .then((txn) => provider.waitForTransaction(txn.hash))
      .then((receipt) => {
        console.log("Sold tokenID %s", tokenId);
        console.log(receipt);

        setSellSuccess(true);
        tokenId == CONSTANTS.HI_TOKEN_ID
          ? setHiSellLoading(false)
          : setLoSellLoading(false);
        updateGameState();
      })
      .catch((err) => setErrorAndClearLoading(err));
  };

  const setErrorAndClearLoading = (error) => {
    console.log(error);
    // We unset everything loading just because it's easy
    // and we know we want nothing loading
    setError(GetErrorMsg(error));
    setHiSellLoading(false);
    setLoSellLoading(false);
    setHiBuyLoading(false);
    setLoBuyLoading(false);
    setApproveButtonLoading(false);
    setPendingTokenBuy(null);
    setPendingTokenSell(null);
    setPendingApproveAmount(0);
  };

  const clearBanners = () => {
    setError(null);
    setApprovalSuccess(false);
    setBuySuccess(false);
    setSellSuccess(false);
    setPendingTokenBuy(null);
    setPendingTokenSell(null);
    setPendingApproveAmount(0);
  };

  const updateGameState = async () => {
    // get the price of the tokens
    const _hiPrice = await HILO.getPrice(
      CONSTANTS.HI_TOKEN_ID,
      provider,
      setHiPrice,
      setErrorAndClearLoading
    );
    const _loPrice = await HILO.getPrice(
      CONSTANTS.LO_TOKEN_ID,
      provider,
      setLoPrice,
      setErrorAndClearLoading
    );
    console.log("prices", _hiPrice, _loPrice);
    setHiPrice(_hiPrice);
    setLoPrice(_loPrice);

    // setup the game over screen if there were winners
    const gameWinners = await HILO.getWinners(
      provider,
      setErrorAndClearLoading
    );
    console.log("winners", gameWinners);
    if (gameWinners.length) {
      setGameOver(true);
      setWinners(gameWinners);
    }

    // get the player totals; HI holders + LO holders
    const _playerTotals = await HILO.getPlayerTotals(provider);
    console.log("player totals", _playerTotals);
    setPlayerTotals(_playerTotals);

    // then check if the user has any tokens
    const hiTokenBalance = await HILO.getBalance(
      CONSTANTS.HI_TOKEN_ID,
      provider,
      setHasHi,
      setErrorAndClearLoading
    );
    const loTokenBalance = await HILO.getBalance(
      CONSTANTS.LO_TOKEN_ID,
      provider,
      setHasLo,
      setErrorAndClearLoading
    );
    console.log("balances", hiTokenBalance, loTokenBalance);
    setHasHi(hiTokenBalance > 0);
    setHasLo(loTokenBalance > 0);

    // check if we're approved to make payments
    HILO.checkApproval(provider, setPaymentApproved, hiPrice).catch((err) =>
      setErrorAndClearLoading(err)
    );

    setGameReady(true);
  };

  // When the page loads!
  useEffect(() => {
    if (web3Modal.cachedProvider) {
      // web3Modal.clearCachedProvider();
      connectWallet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup game info, setup listeners for wallet changes
  useEffect(() => {
    if (!wallet) return;

    if (wallet && provider) updateGameState();

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

    HILO.setupGameEvents(
      provider,
      account,
      updateGameState,
      setPriceUpdatedEvent
    );

    wallet.on("accountsChanged", handleAccountsChanged);
    wallet.on("chainChanged", handleChainChanged);

    return () => {
      if (wallet.removeListener) {
        wallet.removeListener("accountsChanged", handleAccountsChanged);
        wallet.removeListener("chainChanged", handleChainChanged);
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  useEffect(() => {}, [gameReady, gameOver]);

  return (
    <Container fluid css={{ minHeight: "100vh", position: "relative" }}>
      <Text h1 size="8rem" className={styles.title}>
        HiLo
      </Text>

      {/* If wallet isn't connected, show the button. Otherwise show the game */}
      {!wallet ? (
        <>
          <Text size="3rem" className={styles.subtitle}>
            A Game of Tokens
          </Text>
          <Spacer y={10} />
          {renderConnectButton(wallet, connectWallet)}
          {walletError &&
            renderWalletErrorBanner(wallet, walletError, setWalletError)}
        </>
      ) : (
        <>
          {gameOver && (
            <>
              <Text size="3rem" className={styles.subtitle}>
                A Game of Tokens
              </Text>
              <Text h1 size="15vw" className={styles.gameOver}>
                GAME OVER
              </Text>
              {renderWinners(winners, account)}
            </>
          )}
          {!gameOver && gameReady && (
            <>
              {/* Show the player */}
              {account !== null && renderPlayer(account)}
              <Spacer y={1} />
              {playerTotals !== null && renderPlayerTotals(playerTotals)}
              <Spacer y={1} />
              {(hasHi || hasLo) && renderHoldings(hasHi)}
              <Spacer y={2} />

              {/* If payment is not approved, show the button */}
              {!paymentApproved &&
                renderApproveButton(
                  approveButtonLoading,
                  approveModalVisible,
                  setApproveModalVisible,
                  preApprovePayments
                )}

              {/* Show the two tokens */}
              <Grid.Container gap={3} justify="center">
                <Grid xs={10} sm={6} md={4}>
                  {TokenCard(
                    CONSTANTS.HI_TOKEN_NAME,
                    CONSTANTS.HI_TOKEN_ID,
                    hiPrice,
                    buyHandler,
                    sellHandler,
                    hasHi || hasLo || approveButtonLoading || loBuyLoading,
                    !hasHi || approveButtonLoading,
                    hiBuyLoading,
                    hiSellLoading
                  )}
                </Grid>
                <Grid xs={10} sm={6} md={4}>
                  {TokenCard(
                    CONSTANTS.LO_TOKEN_NAME,
                    CONSTANTS.LO_TOKEN_ID,
                    loPrice,
                    buyHandler,
                    sellHandler,
                    hasLo || hasHi || approveButtonLoading || hiBuyLoading,
                    !hasLo || approveButtonLoading,
                    loBuyLoading,
                    loSellLoading
                  )}
                </Grid>

                <Grid xs={10} sm={12} md={8}>
                  {error !== null && renderErrorBanner(error, setError)}

                  {(pendingApproveAmount > 0 || approvalSuccess) &&
                    renderApproveBanner(
                      approvalSuccess,
                      pendingApproveAmount,
                      setApprovalSuccess
                    )}

                  {(pendingTokenBuy !== null || buySuccess) &&
                    renderTradeBanner(
                      "buy",
                      hiPrice,
                      loPrice,
                      pendingTokenBuy,
                      setPendingTokenBuy,
                      buySuccess,
                      setBuySuccess
                    )}

                  {(pendingTokenSell !== null || sellSuccess) &&
                    renderTradeBanner(
                      "sell",
                      hiPrice,
                      loPrice,
                      pendingTokenSell,
                      setPendingTokenSell,
                      sellSuccess,
                      setSellSuccess
                    )}
                  {priceUpdatedEvent !== null &&
                    renderPriceUpdatedBanner(
                      priceUpdatedEvent,
                      setPriceUpdatedEvent
                    )}
                </Grid>
              </Grid.Container>
            </>
          )}
        </>
      )}

      <Spacer y={6} />

      <footer className={styles.footer}>
        <a
          href="https://twitter.com/molocw"
          target="_blank"
          rel="noopener noreferrer"
        >
          A MOLO production
        </a>
        {/* <Text className={styles.howTo} onClick={() => setHowToVisible(true)}>
          How to play
        </Text>
        {HowToPlayModal(howToVisible, setHowToVisible)} */}
      </footer>
    </Container>
  );
}
