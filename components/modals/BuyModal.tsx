import {
  Button,
  Card,
  Grid,
  Image,
  Loading,
  Modal,
  Text,
} from "@nextui-org/react";
import { providers } from "ethers";
import { useState } from "react";
import { approvePayments, buy } from "../../lib/contract";
import { GetErrorMsg } from "../../lib/errors";
import {
  GameState,
  isSolidityError,
  isSolidityTxnReceipt,
  Tokens,
  tokenString,
} from "../../lib/types";

type BuyModalProps = {
  closeFn: () => void;
  provider: providers.Web3Provider;
  token: Tokens;
  gameState: GameState;
};

enum PendingState {
  APPROVING,
  BUYING,
}

export default function BuyModal(props: BuyModalProps) {
  const [amount, setAmount] = useState<1 | 3>(1);
  const [pending, setPending] = useState<PendingState | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { closeFn, provider, token, gameState } = props;

  const successMsg = (
    <Text css={{ marginRight: "20px" }}>
      Successfully bought {amount} {tokenString(token)} token
      {amount > 1 ? "s" : null}!
    </Text>
  );

  const buyFn = async (provider: providers.Web3Provider) => {
    setError(null);

    const cost = amount * tokenPrice;

    if (cost > gameState.approvedSpend) {
      setPending(PendingState.APPROVING);
      const approvalOrError = await approvePayments(cost, provider);
      if (isSolidityError(approvalOrError)) {
        setError(GetErrorMsg(approvalOrError));
        return setPending(null);
      }
    }

    setPending(PendingState.BUYING);
    const buyOrError = await buy(provider, token, amount);
    if (isSolidityTxnReceipt(buyOrError)) {
      console.log("Bought!", token, amount, buyOrError);
      setSuccess(true);
    } else {
      setError(GetErrorMsg(buyOrError));
    }
    setPending(null);
  };

  const tokenIcon =
    token === Tokens.HI ? "/img/hiToken.png" : "/img/loToken.png";
  const tokenPrice =
    token === Tokens.HI ? gameState.currentHi : gameState.currentLo;

  return (
    <Modal
      blur
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      onClose={closeFn}
      open={true}
      className="modal"
    >
      <Modal.Header>
        <Text id="modal-title" h2>
          Buy {tokenString(token)}
        </Text>
      </Modal.Header>
      <Modal.Body>
        <Text size="1.3rem" css={{ textAlign: "center" }}>
          Select the amount to buy
        </Text>
        <br />
        <Card
          isHoverable
          isPressable
          variant={amount === 1 ? "bordered" : "flat"}
          onPress={() => setAmount(1)}
        >
          <Card.Body>
            <Image alt="Token icon" height={40} src={tokenIcon} />
            <Text css={{ textAlign: "center" }}>
              One token for {tokenPrice} USDC
            </Text>
          </Card.Body>
        </Card>
        <Card
          isHoverable
          isPressable
          variant={amount === 3 ? "bordered" : "flat"}
          onPress={() => setAmount(3)}
        >
          <Card.Body>
            <Grid.Container justify="center">
              <Grid xs={4} justify="flex-end"></Grid>
              <Grid xs={4}>
                <Image alt="Token icon" height={40} src={tokenIcon} />
                <Image alt="Token icon" height={40} src={tokenIcon} />
                <Image alt="Token icon" height={40} src={tokenIcon} />
              </Grid>
              <Grid xs={4} justify="flex-start"></Grid>
            </Grid.Container>
            <Text css={{ textAlign: "center" }}>
              Three tokens for {tokenPrice * 3} USDC
              <br />
              The price will {token === Tokens.HI
                ? "decrease "
                : "increase "}{" "}
              after this purchase
            </Text>
          </Card.Body>
        </Card>
      </Modal.Body>
      <Modal.Footer css={{ borderTop: "1px solid grey" }}>
        <Grid>
          {error && <Text color="error">{error}</Text>}
          {pending !== null && (
            <Text css={{ marginRight: "10px" }}>
              {pending === (PendingState.APPROVING as PendingState)
                ? "Approving spend..."
                : "Buying " +
                  amount +
                  (amount > 1 ? " tokens" : " token") +
                  "..."}
            </Text>
          )}
          {success && successMsg}
        </Grid>
        <Button
          auto
          flat
          color="error"
          onClick={closeFn}
          disabled={pending !== null}
        >
          <Text h4>{success ? "Close" : "Cancel"}</Text>
        </Button>
        {!success && (
          <Button
            auto
            onPress={() => buyFn(provider)}
            disabled={pending !== null}
          >
            {pending !== null ? <Loading size="sm" /> : <Text h4>Buy</Text>}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
