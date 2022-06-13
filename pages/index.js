import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

import Web3Modal from "web3modal";
import { providers, Contract } from "ethers";

import abi from "../src/HILOToken.json";

import {
  Container,
  Text,
  Spacer,
  Grid,
  Card,
  Button,
  Modal,
  Row,
} from "@nextui-org/react";

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

  const [hiVisible, setHiVisible] = useState(false);
  const hiHandler = () => setHiVisible(true);
  const closeHiHandler = () => {
    setHiVisible(false);
    console.log("HI modal closed");
  };

  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();

  const contractAddress = "0x4A2ad292A7989Cc10b64B8106d51776B5aC3BED0";
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

  const buyHi = async () => {
    try {
      if (walletConnected) {
        const provider = await getProviderOrSigner(true);

        /*
         * You're using contractABI here
         */
        const HILOContract = new Contract(
          contractAddress,
          contractABI,
          provider
        );

        let buyTxn = await HILOContract.buy(HI_TOKEN_ID, hiPrice);
        console.log("Bought tokenID %s", tokenId);
        console.log(buyTxn);
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
    <Container fluid css={{ minHeight: "100vh", position: "relative" }}>
      <Text h1 className={styles.title}>
        HILO
      </Text>

      <Spacer y={2} />

      <Text h4 className={styles.description}>
        A game of tokens
      </Text>

      <Spacer y={1} />

      <Text h5 className={styles.description}>
        How to play
      </Text>

      {walletConnected ? null : (
        <>
          <Spacer y={1} />
          {
            <Card variant="flat">
              <Card.Body>{renderConnectButton()}</Card.Body>
            </Card>
          }
        </>
      )}

      <Spacer y={6} />

      <Grid.Container gap={3} justify="center">
        <Grid xs={4}>
          <Card variant="bordered">
            <Card.Header>
              <Text className={styles.hiTitle}>HI</Text>
            </Card.Header>
            <Card.Body>${hiPrice}</Card.Body>
            <Card.Divider />
            <Card.Footer>
              <Button size="sm" onClick={hiHandler}>
                Trade
              </Button>
              <Modal
                closeButton
                blur
                aria-labelledby="modal-title"
                open={hiVisible}
                onClose={closeHiHandler}
              >
                <Modal.Header>
                  <Text h3 id="modal-title" size={18}>
                    Trade HI
                  </Text>
                </Modal.Header>
                <Modal.Body>
                  <Row justify="space-around">
                    <Button auto flat color="secondary" onPress={buyHi}>
                      Buy
                    </Button>
                    <Button auto flat color="success">
                      Sell
                    </Button>
                  </Row>
                </Modal.Body>
              </Modal>
            </Card.Footer>
          </Card>
        </Grid>
        <Grid xs={4}>
          <Card variant="bordered">
            <Card.Header>
              <Text className={styles.loTitle}>LO</Text>
            </Card.Header>
            <Card.Body>${loPrice}</Card.Body>
            <Card.Divider />
            <Card.Footer>
              <Button size="sm">Trade</Button>
            </Card.Footer>
          </Card>
        </Grid>
      </Grid.Container>

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
