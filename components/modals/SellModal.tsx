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
import { approvePayments, buy, sell } from "../../lib/contract";
import { GetErrorMsg } from "../../lib/errors";
import {
  GameState,
  isSolidityError,
  isSolidityTxnReceipt,
  Tokens,
  tokenString,
} from "../../lib/types";

type SellModalProps = {
  closeFn: () => void;
  provider: providers.Web3Provider;
  token: Tokens;
  gameState: GameState;
};

export default function SellModal(props: SellModalProps) {
  const [pending, setPending] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { closeFn, provider, token, gameState } = props;

  const sellFn = async (provider: providers.Web3Provider) => {
    setError(null);
    setPending(true);

    const sellOrError = await sell(provider, token);
    if (isSolidityTxnReceipt(sellOrError)) {
      console.log("Bought!", token, sellOrError);
      setSuccess(true);
    } else {
      setError(GetErrorMsg(sellOrError));
    }
    setPending(null);
  };

  const tokenIcon =
    token === Tokens.HI ? "/img/hiToken.png" : "/img/loToken.png";
  const tokenPrice =
    token === Tokens.HI ? gameState.currentHi : gameState.currentLo;
  const tokenBalance = gameState.tokenBalances[token];

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
          Sell {tokenString(token)}
        </Text>
      </Modal.Header>
      <Modal.Body>
        <Text size="1.3rem">
          {tokenBalance > 1
            ? `You may only sell one token for ${tokenPrice} USDC.`
            : `Sell your token for ${tokenPrice} USDC.`}
          <br />
          The price will {token === Tokens.HI ? "decrease " : "increase "} after
          this purchase.
        </Text>
      </Modal.Body>
      <Modal.Footer css={{ borderTop: "1px solid grey" }}>
        <Grid>
          {error && <Text color="error">{error}</Text>}
          {pending && <Text css={{ marginRight: "10px" }}>Selling...</Text>}
          {success && (
            <Text css={{ marginRight: "20px" }}>
              Sold {tokenString(token)} token!
            </Text>
          )}
        </Grid>
        <Button auto flat color="error" onClick={closeFn} disabled={pending}>
          <Text h4>{success ? "Close" : "Cancel"}</Text>
        </Button>
        {!success && (
          <Button auto onPress={() => sellFn(provider)} disabled={pending}>
            {pending ? <Loading size="sm" /> : <Text h4>Sell</Text>}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
