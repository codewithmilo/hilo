import { useEffect, useRef, useState } from "react";
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
  Card,
  Button,
  Modal,
} from "@nextui-org/react";

const POLYGON_CHAIN_ID = 137;
const MUMBAI_CHAIN_ID = 80001;
const CHAIN_ID = MUMBAI_CHAIN_ID;

const HI_TOKEN_ID = 0;
const LO_TOKEN_ID = 1;

const USDC_ADDRESS = "0xe11A86849d99F524cAC3E7A0Ec1241828e332C62";

export default function Home() {
  // keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);

  // keep track of whether the user has given payment approval or not
  const [paymentApproved, setPaymentApproved] = useState(false);

  // updated prices of the tokens
  const [hiPrice, setHiPrice] = useState(0);
  const [loPrice, setLoPrice] = useState(0);

  const [hasHi, setHasHi] = useState(false);
  const [hasLo, setHasLo] = useState(false);

  const [howToVisible, setHowToVisible] = useState(false);

  const [approveModalVisible, setApproveModalVisible] = useState(false);

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

  const approvePayments = async () => {
    try {
      if (walletConnected && !paymentApproved) {
        const signer = await getProviderOrSigner(true);
        const address = await signer.getAddress();
        const usdcABI = [
          "function approve(address _spender, uint256 _value) public returns (bool success)",
        ];
        // pre-approval for the max Hi
        const amount = utils.parseUnits("1000", 18);

        const USDCContract = new Contract(USDC_ADDRESS, usdcABI, signer);

        const approved = await USDCContract.approve(address, amount);
        console.log("Got approval?", approved);
        if (approved) setPaymentApproved(true);
      } else {
        console.log("Didn't approve!");
      }
    } catch (error) {
      console.log(error);
    }
  };

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
            <Modal
              blur
              aria-labelledby="modal-title"
              aria-describedby="modal-description"
              onClose={() => setApproveModalVisible(false)}
              open={approveModalVisible}
            >
              <Modal.Header>
                <Text id="modal-title" h2>
                  Pre-approve payments
                </Text>
              </Modal.Header>
              <Modal.Body>
                <Text id="modal-description" size="1.3rem">
                  This will ask you to approve payments up to $1,000 but you
                  will only ever be charged at the shown price at the time of
                  purchase. You will not need to approve payments again.
                </Text>
                <br />
                <Text size="1.3rem">
                  If you would like to wait to approve the exact amount at
                  purchase, you can simply do so when you get to it.
                </Text>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  auto
                  flat
                  color="error"
                  onClick={() => setApproveModalVisible(false)}
                >
                  <Text h4>Cancel</Text>
                </Button>
                <Button auto onClick={approvePayments}>
                  <Text h4>Approve</Text>
                </Button>
              </Modal.Footer>
            </Modal>
          </>
        );
      }
    }

    return null;
  };

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

  const toggleHowTo = () => {
    setHowToVisible(!howToVisible);
  };

  const buyHiHandler = async () => {
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

  const sellHiHandler = async () => {};
  const buyLoHandler = async () => {};
  const sellLoHandler = async () => {};

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

      // then check if the user has any tokens
      getBalance(HI_TOKEN_ID);
      getBalance(LO_TOKEN_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected]);

  return (
    <Container fluid css={{ minHeight: "100vh", position: "relative" }}>
      <Text h1 size="8rem" className={styles.title}>
        HiLo
      </Text>

      <Text size="3rem" className={styles.subtitle}>
        A Game of Tokens
      </Text>

      <Spacer y={2} />

      {walletConnected ? (
        <>
          {!paymentApproved && renderApproveButton()}
          <Grid.Container gap={3} justify="center">
            <Grid xs={4}>
              {tokenCard(
                "Hi",
                hiPrice,
                buyHiHandler,
                sellHiHandler,
                hasHi,
                !hasHi
              )}
            </Grid>
            <Grid xs={4}>
              {tokenCard(
                "Lo",
                loPrice,
                buyLoHandler,
                sellLoHandler,
                hasLo,
                !hasLo
              )}
            </Grid>
          </Grid.Container>
        </>
      ) : (
        renderConnectButton()
      )}

      <Spacer y={4} />

      <Text size="1.8rem" className={styles.howTo} onClick={toggleHowTo}>
        How to play
      </Text>

      <Spacer y={1} />

      {howToVisible && howToDescription}

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

const tokenCard = (
  tokenType,
  price,
  buy,
  sell,
  shouldDisableBuy,
  shouldDisableSell
) => (
  <Card variant="bordered">
    <Card.Body className={styles.tokenCard}>
      <Text h1>{tokenType}</Text>
      <Text h2>${price}</Text>
    </Card.Body>
    <Card.Divider />
    <Card.Footer css={{ justifyContent: "center" }}>
      <Button.Group color="gradient" size="md" ghost>
        <Button onPress={buy} disabled={shouldDisableBuy}>
          <Text h3>Buy</Text>
        </Button>
        <Button onPress={sell} disabled={shouldDisableSell}>
          <Text h3>Sell</Text>
        </Button>
      </Button.Group>
    </Card.Footer>
  </Card>
);

const howToDescription = (
  <Card variant="flat" className={styles.description}>
    <Card.Body>
      <Text size="1.5rem">
        Buy a <b>Hi</b> or <b>Lo</b> token (with USDC)
        <br />
        <b>Lo</b> starts at <b>$1</b>
        <br />
        <b>Hi</b> starts at <b>$1,000</b>
      </Text>
      <Text size="1.5rem">
        If there are two buys of a single token
        <br />
        <b>Lo</b> increases by <b>$1 // Hi</b> decreases by <b>$1</b>
      </Text>
      <br />
      <Text>
        Sell back a <b>Lo</b> to get a profit after the price has increased
        <br />
        Sell back a <b>Hi</b> to get a free <b>Lo</b> token
      </Text>
      <br />
      <Text>
        When the prices converge—a <b>Hi</b> and <b>Lo</b> are both sold for the
        same price—<b>the game is over</b>
        <br />
        The two winners who sold split the jackpot of <b>$100,000</b>
        <br />
      </Text>
      <br />
      <Text size="1.5rem" css={{ textAlign: "center" }}>
        Good luck!
      </Text>
    </Card.Body>
  </Card>
);
