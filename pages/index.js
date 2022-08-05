import { useEffect, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { providers, Contract } from "ethers";

import { Container, Text, Spacer, Grid } from "@nextui-org/react";
import { TokenCard } from "../components/buttons";

import { GetErrorMsg, getWalletError, handleTxnError } from "../lib/errors";
import { CONSTANTS } from "../lib/constants";
import * as HILO from "../lib/contract";

import abi from "../src/HILO.json";

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

  // Pre-approve the contract to spend the user's USDC
  // Set at the highest possible amount in the game
  const preApprovePayments = async () => {
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
    // add 5 if it's LO, in case the price updates while purchasing
    const amount = tokenId === CONSTANTS.LO_TOKEN_ID ? loPrice + 5 : hiPrice;
    const approved = await HILO.checkApproval(
      provider,
      setPaymentApproved,
      amount
    ).catch((err) => setErrorAndClearLoading(err));

    // nothing to do if already approved
    if (approved) return Promise.resolve();

    // otherwise we need to ask the user to approve the payment
    return await HILO.approvePayments(
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

        return HILOContract.buy(tokenId).catch((err) => {
          if (
            err.reason ==
            "execution reverted: ERC20: transfer amount exceeds allowance"
          ) {
            // retry if the approval didn't catch
            return buyHandler(tokenId);
          }
        });
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

  const addToQueue = async (tokenId) => {
    console.log("Adding to queue...");
    setSalesLockedPending(true);
    const inline = await HILO.addToQueue(
      provider,
      tokenId,
      setErrorAndClearLoading
    );
    console.log("Added, inline:", inline);
    setSalesQueueIndex(inline);
    setSalesLockedSuccess(true);
    setSalesLockedPending(false);
    setHiSellLoading(false);
    setLoSellLoading(false);
  };

  const setErrorAndClearLoading = (error) => {
    console.log(error);
    const errorMsg = GetErrorMsg(error);
    setError(errorMsg);
  };

  const updateGameState = async () => {
    HILO.getGameState(provider)
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
        HILO.setupGameEvents(
          provider,
          account,
          updateGameState,
          setPriceUpdated
        )
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
          onClick={() => setModalVisible(Modals.HowToPlay)}
        >
          How to play
        </Text>
        <HiloModal visible={modalVisible} setVisible={setModalVisible} />

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
              open={() => setModalVisible(Modals.APPROVE)}
              close={() => setModalVisible(false)}
            />
          </>
        )}
      </Container>
    </>
  );
}
