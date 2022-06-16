import { useEffect, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

import Web3Modal from "web3modal";
import { providers, Contract, utils } from "ethers";

import abi from "../src/HILOToken.json";

import {
  Container,
  Text,
  Spacer,
  Grid,
  Button,
  Loading,
  Card,
} from "@nextui-org/react";
import { TokenCard } from "../components/TokenCard";
import { HowToPlayModal } from "../components/HowToPlayModal";
import { ConfirmApproveModal } from "../components/ConfirmApproveModal";

import GetErrorMsg from "../components/errors";

const POLYGON_CHAIN_ID = 137;
const MUMBAI_CHAIN_ID = 80001;
const CHAIN_ID = MUMBAI_CHAIN_ID;

const MUMBAI_CHAIN = "mumbai";
const POLYGON_CHAIN = "polygon";
const CHAIN_NAME = MUMBAI_CHAIN;

const HI_TOKEN_ID = 0;
const LO_TOKEN_ID = 1;
const HI_TOKEN_NAME = "Hi";
const LO_TOKEN_NAME = "Lo";

// The highest possible price in the game, for pre-approval
const MAX_APPROVAL_AMOUNT = 1000;

const HILO_CONTRACT_ADDRESS = "0xdFe7BB50ea729aBA877e4AcdF0548175240CB82D";

const USDC_ADDRESS = "0xe11A86849d99F524cAC3E7A0Ec1241828e332C62";

let web3Modal;
if (typeof window !== "undefined") {
  web3Modal = new Web3Modal({
    network: CHAIN_NAME,
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
  const [chainId, setChainId] = useState(null);
  const [gameReady, setGameReady] = useState(false);

  // keep track of whether the user has given payment approval or not
  const [paymentApproved, setPaymentApproved] = useState(false);

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
  const [pendingApproveAmount, setPendingApproveAmount] = useState(0);
  const [approvalSuccess, setApprovalSuccess] = useState(false);

  // Buy/sell banners
  const [buySuccess, setBuySuccess] = useState(false);
  const [pendingTokenBuy, setPendingTokenBuy] = useState(null); // this becomes 0 or 1
  const [sellSuccess, setSellSuccess] = useState(false);
  const [pendingTokenSell, setPendingTokenSell] = useState(null); // this becomes 0 or 1

  // errors
  const [error, setError] = useState(null);
  const [walletError, setWalletError] = useState(null);

  // The HILO contract
  const contractAddress = HILO_CONTRACT_ADDRESS;
  const contractABI = abi.abi;

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
        if (network.chainId !== CHAIN_ID) {
          web3Modal.clearCachedProvider();
          throw new Error("bad_chain");
        }

        // otherwise it ok
        setProvider(library);
        setChainId(network.chainId);
        setGameReady(true);
      })
      .catch((err) => showWalletError(err));
  };

  // Get the token prices (done at page load + any update events)
  const getPrice = async (tokenId) => {
    const HILOContract = new Contract(contractAddress, contractABI, provider);

    await HILOContract.getPrice(tokenId)
      .then((price) => {
        console.log("Got price for tokenID %s: %s", tokenId, price.toNumber());
        if (tokenId === HI_TOKEN_ID) {
          setHiPrice(price.toNumber());
        } else {
          setLoPrice(price.toNumber());
        }
      })
      .catch((err) => setErrorAndClearLoading(err));
  };

  // Get the player's token balance (done at page load + buy/sell actions)
  const getBalance = async (tokenId) => {
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    const HILOContract = new Contract(contractAddress, contractABI, signer);

    await HILOContract.balanceOf(address, tokenId)
      .then((balance) => {
        console.log(
          "Got balance for tokenID %s: %s",
          tokenId,
          balance.toNumber()
        );
        if (tokenId === HI_TOKEN_ID) {
          setHasHi(balance.toNumber() > 0);
        } else {
          setHasLo(balance.toNumber() > 0);
        }
      })
      .catch((err) => setErrorAndClearLoading(err));
  };

  // Check if the user has given payment approval
  const checkApproval = async (amount = MAX_APPROVAL_AMOUNT) => {
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const usdcABI = [
      "function allowance(address owner, address spender) external view returns (uint256)",
    ];
    const USDCContract = new Contract(USDC_ADDRESS, usdcABI, signer);

    return USDCContract.allowance(address, contractAddress)
      .then((_allowance) => {
        const allowance = parseInt(utils.formatEther(_allowance));
        console.log("Allowance is:", allowance);

        if (allowance >= amount) {
          if (allowance == MAX_APPROVAL_AMOUNT) setPaymentApproved(true);
          return true;
        } else {
          return false;
        }
      })
      .catch((err) => {
        setErrorAndClearLoading(err);
        throw err;
      });
  };

  // Pre-approve the contract to spend the user's USDC
  // Set at the highest possible amount in the game
  const preApprovePayments = async () => {
    setApproveButtonLoading(true);
    setApproveModalVisible(false);

    await approvePayments(MAX_APPROVAL_AMOUNT).then((receipt) => {
      console.log(receipt);
      setPaymentApproved(true);
      setApprovalSuccess(true);
      setPendingApproveAmount(0);
    });
  };

  // Approve payments for USDC (when button is clicked)
  // default to the max possible in the game if not specified
  // returns the txn receipt
  const approvePayments = async (_amount) => {
    // Show in the UI
    setPendingApproveAmount(_amount);

    const signer = provider.getSigner();
    const usdcABI = [
      "function approve(address _spender, uint256 _value) public returns (bool success)",
    ];

    // Format for the actual transaction
    const amount = utils.parseUnits(_amount.toString(), 18);

    const USDCContract = new Contract(USDC_ADDRESS, usdcABI, signer);

    return USDCContract.approve(contractAddress, amount)
      .then((txn) => provider.waitForTransaction(txn.hash))
      .then((receipt) => {
        console.log("Approved!", receipt);
        setPendingApproveAmount(0);
        if (amount === MAX_APPROVAL_AMOUNT) setPaymentApproved(true);
      })
      .catch((err) => {
        setErrorAndClearLoading(err);
        // don't let us continue
        throw err;
      });
  };

  // returns nothing or the txn receipt
  const checkApprovalAndPossiblyApprove = async (tokenId) => {
    // add one if it's LO, in case the price updates while purchasing
    const amount = tokenId === LO_TOKEN_ID ? loPrice + 1 : hiPrice;
    const approved = await checkApproval(amount);

    // nothing to do if already approved
    if (approved) return Promise.resolve();

    // otherwise we need to ask the user to approve the payment
    await approvePayments(amount);
  };

  // Buy a token
  const buyHandler = async (tokenId) => {
    tokenId == HI_TOKEN_ID ? setHiBuyLoading(true) : setLoBuyLoading(true);
    checkApprovalAndPossiblyApprove(tokenId)
      .then(async () => {
        setPendingTokenBuy(tokenId);
        const signer = provider.getSigner();
        const HILOContract = new Contract(contractAddress, contractABI, signer);
        await HILOContract.buy(tokenId);
      })
      .then((txn) => provider.waitForTransaction(txn.hash))
      .then((receipt) => {
        console.log("Bought tokenID %s", tokenId);
        console.log(receipt);

        setBuySuccess(true);
        setPendingTokenBuy(null);
        tokenId == HI_TOKEN_ID
          ? setHiBuyLoading(false)
          : setLoBuyLoading(false);

        updateGameState();
      })
      .catch((err) => setErrorAndClearLoading(err));
  };

  // Sell a token
  const sellHandler = async (tokenId) => {
    tokenId == HI_TOKEN_ID ? setHiSellLoading(true) : setLoSellLoading(true);

    setPendingTokenSell(tokenId);
    const signer = provider.getSigner();
    const HILOContract = new Contract(contractAddress, contractABI, signer);

    await HILOContract.sell(tokenId)
      .then((txn) => provider.waitForTransaction(txn.hash))
      .then((receipt) => {
        console.log("Sold tokenID %s", tokenId);
        console.log(receipt);

        setSellSuccess(true);
        setPendingTokenSell(null);
        tokenId == HI_TOKEN_ID
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

  const updateGameState = () => {
    // get the price of the tokens
    getPrice(HI_TOKEN_ID).catch((err) => setErrorAndClearLoading(err));
    getPrice(LO_TOKEN_ID).catch((err) => setErrorAndClearLoading(err));

    // then check if the user has any tokens
    getBalance(HI_TOKEN_ID).catch((err) => setErrorAndClearLoading(err));
    getBalance(LO_TOKEN_ID).catch((err) => setErrorAndClearLoading(err));

    // check if we're approved to make payments
    checkApproval().catch((err) => setErrorAndClearLoading(err));

    console.log(chainId, account);
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
      if (accounts.length) {
        setAccount(accounts[0]);
        // Update game state since it differs for them
        updateGameState();
      } else {
        (async function () {
          await web3Modal.clearCachedProvider();
        })();
        window.location.reload();
      }
    };

    const handleChainChanged = (chainId) => {
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const showWalletError = (error) => {
    console.log(error, error.message);
    let errDisplay;
    switch (error.message) {
      case "bad_chain":
        errDisplay = "Please switch to the Polygon network to play.";
        break;
      case "User Rejected":
        errDisplay = "Request to connect rejected. Please try again.";
        break;
      default:
        errDisplay = "Something went wrong. Please try again.";
        break;
    }
    setWalletError(errDisplay);
  };

  const renderPlayer = () => {
    const truncateAddress = (address) => {
      if (!address) return "No Account";
      const match = address.match(
        /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/
      );
      if (!match) return address;
      return `${match[1]}…${match[2]}`;
    };
    return (
      <Card
        variant="bordered"
        css={{ maxWidth: "300px", margin: "0 auto", padding: "10px" }}
      >
        <Text h4 css={{ textAlign: "center" }}>
          Player {truncateAddress(account)} connected
        </Text>
      </Card>
    );
  };

  const renderConnectButton = () => {
    if (wallet) {
      return null;
    } else {
      return (
        <Button
          color="gradient"
          size="xl"
          css={{
            maxWidth: "200px",
            margin: "0 auto",
          }}
          onPress={connectWallet}
        >
          Connect wallet to play
        </Button>
      );
    }
  };

  const renderApproveButton = () => (
    <>
      <Button
        color="gradient"
        size="lg"
        css={{ maxWidth: "200px", margin: "0 auto" }}
        onPress={() => setApproveModalVisible(true)}
        disabled={approveButtonLoading}
      >
        {approveButtonLoading ? (
          <Loading type="points-opacity" color="currentColor" size="lg" />
        ) : (
          "Pre-approve payments"
        )}
      </Button>
      <Spacer y={1} />
      {ConfirmApproveModal(
        approveModalVisible,
        setApproveModalVisible,
        preApprovePayments
      )}
    </>
  );

  const renderApproveBanner = () => (
    <Card variant="bordered">
      <Card.Body>
        {approvalSuccess ? (
          <Text b color="white" size="lg" css={{ textAlign: "center" }}>
            Successfully approved!
          </Text>
        ) : (
          <Loading type="points-opacity" color="secondary" size="lg">
            Approving USDC transactions...
          </Loading>
        )}
      </Card.Body>
    </Card>
  );

  const renderBuyBanner = () => {
    const token =
      pendingTokenBuy === HI_TOKEN_ID ? HI_TOKEN_NAME : LO_TOKEN_NAME;
    const price = pendingTokenBuy === HI_TOKEN_ID ? hiPrice : loPrice;
    return (
      <Card variant="bordered">
        <Card.Body>
          {buySuccess ? (
            <Text b color="white" size="lg" css={{ textAlign: "center" }}>
              You just bought a {token} token!
            </Text>
          ) : (
            <Loading type="points-opacity" color="secondary" size="lg">
              Buying a {token} token for ${price}...
            </Loading>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderSellBanner = () => {
    const token =
      pendingTokenSell === HI_TOKEN_ID ? HI_TOKEN_NAME : LO_TOKEN_NAME;
    const price = pendingTokenSell === HI_TOKEN_ID ? hiPrice : loPrice;
    return (
      <Card variant="bordered">
        <Card.Body>
          {sellSuccess ? (
            <Text b color="white" size="lg" css={{ textAlign: "center" }}>
              You just bought a {token} token!
            </Text>
          ) : (
            <Loading type="points-opacity" color="secondary" size="lg">
              Buying a {token} token for ${price}...
            </Loading>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderErrorBanner = () => (
    <Card
      isPressable
      variant="flat"
      css={{
        backgroundColor: "#910838",
        padding: "10px",
      }}
      onClick={() => setError(null)}
    >
      <Text b color="white" size="1.3rem" css={{ textAlign: "center" }}>
        {error}
      </Text>
    </Card>
  );

  return (
    <Container fluid css={{ minHeight: "100vh", position: "relative" }}>
      <Text h1 size="8rem" className={styles.title}>
        HiLo
      </Text>

      <Text size="3rem" className={styles.subtitle}>
        A Game of Tokens
      </Text>

      {/* If wallet isn't connected, show the button. Otherwise show the game */}
      {!gameReady ? (
        <>
          <Spacer y={10} />
          {renderConnectButton()}
          {walletError && (
            <>
              <Spacer y={2} />
              <Card
                isPressable={!wallet}
                variant="bordered"
                css={{ margin: "0 auto", maxWidth: "600px" }}
                onPress={() => setWalletError(null)}
              >
                <Card.Body>
                  <Text
                    b
                    color="error"
                    size="1.3rem"
                    css={{ textAlign: "center" }}
                  >
                    {walletError}
                  </Text>
                </Card.Body>
              </Card>
            </>
          )}
        </>
      ) : (
        <>
          {/* Show the player */}
          {account !== null && renderPlayer()}
          <Spacer y={2} />

          {/* If payment is not approved, show the button */}
          {!paymentApproved && renderApproveButton()}

          {/* Show the two tokens */}
          <Grid.Container gap={3} justify="center">
            <Grid xs={10} sm={6} md={4}>
              {TokenCard(
                HI_TOKEN_NAME,
                HI_TOKEN_ID,
                hiPrice,
                buyHandler,
                sellHandler,
                hasHi || hasLo || approveButtonLoading,
                !hasHi || approveButtonLoading,
                hiBuyLoading,
                hiSellLoading
              )}
            </Grid>
            <Grid xs={10} sm={6} md={4}>
              {TokenCard(
                LO_TOKEN_NAME,
                LO_TOKEN_ID,
                loPrice,
                buyHandler,
                sellHandler,
                hasLo || hasHi || approveButtonLoading,
                !hasLo || approveButtonLoading,
                loBuyLoading,
                loSellLoading
              )}
            </Grid>
            {error !== null ||
            pendingApproveAmount > 0 ||
            approvalSuccess ||
            pendingTokenBuy !== null ||
            buySuccess ||
            sellSuccess ? (
              <Grid xs={10} sm={12} md={8}>
                {error !== null && renderErrorBanner()}
                {(pendingApproveAmount > 0 || approvalSuccess) &&
                  renderApproveBanner()}
                {pendingTokenBuy !== null && renderBuyBanner()}
                {pendingTokenSell !== null && renderSellBanner()}
              </Grid>
            ) : null}
          </Grid.Container>
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
        <Text className={styles.howTo} onClick={() => setHowToVisible(true)}>
          How to play
        </Text>
        {HowToPlayModal(howToVisible, setHowToVisible)}
      </footer>
    </Container>
  );
}
