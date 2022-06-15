import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

import Web3Modal from "web3modal";
import { providers, Contract, utils, getDefaultProvider } from "ethers";

import abi from "../src/HILOToken.json";

import { Container, Text, Spacer, Grid, Button } from "@nextui-org/react";
import { TokenCard } from "../components/TokenCard";
import { HowToPlayModal } from "../components/HowToPlayModal";
import { ConfirmApproveModal } from "../components/ConfirmApproveModal";

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

const HILO_CONTRACT_ADDRESS = "0xf8584b3Ae6f4254b476B71409eD89E108627AFb2";

const USDC_ADDRESS = "0xe11A86849d99F524cAC3E7A0Ec1241828e332C62";

export default function Home() {
  // keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);

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

  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();

  // The HILO contract
  const contractAddress = HILO_CONTRACT_ADDRESS;
  const contractABI = abi.abi;

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Polygon/Mumbai network, let them know and throw an error
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

  // Get the token prices (done at page load + any update events)
  const getPrice = async (tokenId) => {
    try {
      if (walletConnected) {
        const provider = await getProviderOrSigner();

        const HILOContract = new Contract(
          contractAddress,
          contractABI,
          provider
        );

        const price = await HILOContract.getPrice(tokenId);
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

  // Get the player's token balance (done at page load + buy/sell actions)
  const getBalance = async (tokenId) => {
    try {
      if (walletConnected) {
        const signer = await getProviderOrSigner(true);
        const address = await signer.getAddress();

        const HILOContract = new Contract(contractAddress, contractABI, signer);

        const balance = await HILOContract.balanceOf(address, tokenId);
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
      } else {
        console.log("Wallet not connected!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Check if the user has given payment approval (done at page load)
  const checkApproval = async () => {
    try {
      if (walletConnected) {
        const signer = await getProviderOrSigner(true);
        const address = await signer.getAddress();
        const usdcABI = [
          "function allowance(address owner, address spender) external view returns (uint256)",
        ];
        const USDCContract = new Contract(USDC_ADDRESS, usdcABI, signer);

        const allowance = await USDCContract.allowance(
          address,
          contractAddress
        );
        console.log("Allowance is:", utils.formatEther(allowance));
        if (allowance > 0) setPaymentApproved(true);
      } else {
        console.log("Couldn't get allowance");
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Approve payments for USDC (when button is clicked)
  // default to the max possible in the game if not specified
  const approvePayments = async (_amount = MAX_APPROVAL_AMOUNT) => {
    try {
      if (walletConnected && !paymentApproved) {
        const signer = await getProviderOrSigner(true);
        const usdcABI = [
          "function approve(address _spender, uint256 _value) public returns (bool success)",
        ];

        const amount = utils.parseUnits(_amount.toString(), 18);

        const USDCContract = new Contract(USDC_ADDRESS, usdcABI, signer);

        const approved = await USDCContract.approve(contractAddress, amount);
        console.log("Got approval?", approved);
        if (approved) setPaymentApproved(true);
      } else {
        console.log("Didn't approve!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const checkApprovalAndPossiblyApprove = async (tokenId) => {
    try {
      // this will set paymentApproved
      checkApproval();

      if (paymentApproved) return; // we are good to go, nothing to do

      // we need to ask the user to approve the payment
      // add one if it's LO, in case the price updates while purchasing
      const amount = tokenId === LO_TOKEN_ID ? loPrice + 1 : hiPrice;
      approvePayments(amount);
    } catch (error) {
      console.log(error);
    }
  };

  // Buy a token
  const buyHandler = async (tokenId) => {
    await checkApprovalAndPossiblyApprove(tokenId);
    try {
      if (walletConnected) {
        const signer = await getProviderOrSigner(true);
        const HILOContract = new Contract(contractAddress, contractABI, signer);

        const buyTxn = await HILOContract.buy(tokenId);
        console.log("Bought tokenID %s", tokenId);
        console.log(buyTxn);
      } else {
        console.log("Wallet not connected!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Sell a token
  const sellHandler = async (tokenId) => {
    await checkApprovalAndPossiblyApprove();
    try {
      if (walletConnected) {
        const signer = await getProviderOrSigner(true);
        const HILOContract = new Contract(contractAddress, contractABI, signer);

        const sellTxn = await HILOContract.sell(tokenId);
        console.log("Sold tokenID %s", tokenId);
        console.log(sellTxn);
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
        network: CHAIN_NAME,
        providerOptions: {},
        disableInjectedProvider: false,
      });
    } else {
      // if wallet is connected, get the price of the tokens
      getPrice(HI_TOKEN_ID);
      getPrice(LO_TOKEN_ID);

      // then check if the user has any tokens
      getBalance(HI_TOKEN_ID);
      getBalance(LO_TOKEN_ID);

      // check if we're approved to make payments
      checkApproval();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected]);

  // useEffect(() => {
  //   // on page load, try to connect wallet TODO
  // }, []);

  const renderConnectButton = () => {
    if (walletConnected) {
      return null;
    } else {
      return (
        <Button
          color="gradient"
          size="lg"
          css={{ maxWidth: "200px", margin: "0 auto" }}
          onPress={connectWallet}
        >
          Connect wallet to play
        </Button>
      );
    }
  };

  const renderApproveButton = () => {
    if (walletConnected) {
      if (!paymentApproved) {
        return (
          <>
            <Button
              color="gradient"
              size="lg"
              css={{ maxWidth: "200px", margin: "0 auto" }}
              onPress={() => setApproveModalVisible(true)}
            >
              Pre-approve payments
            </Button>
            <Spacer y={1} />
            {ConfirmApproveModal(
              approveModalVisible,
              setApproveModalVisible,
              approvePayments
            )}
          </>
        );
      }
    }

    return null;
  };

  return (
    <Container fluid css={{ minHeight: "100vh", position: "relative" }}>
      <Text h1 size="8rem" className={styles.title}>
        HiLo
      </Text>

      <Text size="3rem" className={styles.subtitle}>
        A Game of Tokens
      </Text>

      <Spacer y={2} />

      {/* If wallet isn't connected, show the button. Otherwise show the game */}
      {!walletConnected ? (
        renderConnectButton()
      ) : (
        <>
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
                hasHi || hasLo,
                !hasHi
              )}
            </Grid>
            <Grid xs={10} sm={6} md={4}>
              {TokenCard(
                LO_TOKEN_NAME,
                LO_TOKEN_ID,
                loPrice,
                buyHandler,
                sellHandler,
                hasLo || hasHi,
                !hasLo
              )}
            </Grid>
          </Grid.Container>
        </>
      )}

      <Spacer y={4} />

      <Text
        size="1.8rem"
        className={styles.howTo}
        onClick={() => setHowToVisible(true)}
      >
        How to play
      </Text>
      {HowToPlayModal(howToVisible, setHowToVisible)}

      <Spacer y={6} />

      <footer className={styles.footer}>
        <a
          href="https://twitter.com/molocw"
          target="_blank"
          rel="noopener noreferrer"
        >
          A MOLO production
        </a>
      </footer>
    </Container>
  );
}
