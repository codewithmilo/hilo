import { Button, Grid, Loading, Modal, Spacer, Text } from "@nextui-org/react";
import { providers } from "ethers";
import { useEffect, useState } from "react";
import {
  checkCanSell,
  checkQueuePosition,
  joinSellQueue,
  sell,
} from "../../lib/contract";
import { GetErrorMsg } from "../../lib/errors";
import {
  GameState,
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
  const [canSell, setCanSell] = useState<boolean>(false);
  const [queuePosition, setQueuePosition] = useState<number>(0);

  const { closeFn, provider, token, gameState } = props;

  const sellOrJoinQueue = async () => {
    if (canSell) {
      return sellFn();
    } else {
      return joinQueue();
    }
  };

  const sellFn = async () => {
    setError(null);
    setPending(true);

    const sellOrError = await sell(provider, token);
    if (isSolidityTxnReceipt(sellOrError)) {
      console.log("Sold!", token, sellOrError);
      setSuccess(true);
    } else {
      setError(GetErrorMsg(sellOrError));
    }
    setPending(null);
  };

  const joinQueue = async () => {
    setError(null);
    setPending(true);

    const positionOrError = await joinSellQueue(provider, token);
    if (typeof positionOrError === "number") {
      console.log("Joined!", token, positionOrError);
      setQueuePosition(positionOrError);
      setSuccess(true);
    } else {
      setError(GetErrorMsg(positionOrError));
    }
    setPending(null);
  };

  const tokenPrice =
    token === Tokens.HI ? gameState.currentHi : gameState.currentLo;
  const tokenBalance = gameState.tokenBalances[token];

  // check if we can sell/queue position on render
  useEffect(() => {
    let _canSell: boolean, _queuePosition: number;
    (async () => {
      // You can await here
      _canSell = await checkCanSell(provider, token);
      _queuePosition = await checkQueuePosition(provider, token);
    })();

    setCanSell(_canSell);
    setQueuePosition(_queuePosition);
  }, [provider, token]);

  const SellDescription = (
    <Text size="1.3rem">
      {tokenBalance > 1
        ? `You may only sell one token for ${tokenPrice} USDC.`
        : `Sell your token for ${tokenPrice} USDC.`}
      <br />
      The price will {token === Tokens.HI ? "decrease " : "increase "} after
      this purchase.
    </Text>
  );

  const SellQueue = (
    <Text size="1.3rem">
      Selling is currently locked for this price. <Spacer y={1} />
      {queuePosition > 0 ? (
        queuePosition == 1 ? (
          `You are next in line to sell.`
        ) : (
          `You are number ${queuePosition} in line to sell.`
        )
      ) : (
        <>
          Would you like to join the sell queue?
          <Spacer y={1} />
          When the price of tokens change, HILO will pull from the queue and
          sell for that player.
        </>
      )}
    </Text>
  );

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
      <Modal.Body>{canSell ? SellDescription : SellQueue}</Modal.Body>
      <Modal.Footer css={{ borderTop: "1px solid grey" }}>
        <Grid>
          {error && <Text color="error">{error}</Text>}
          {pending && (
            <Text css={{ marginRight: "10px" }}>
              {canSell ? "Selling..." : "Joining queue..."}
            </Text>
          )}
          {success && (
            <Text css={{ marginRight: "20px" }}>
              {canSell ? `Sold ${tokenString(token)} token!` : `Joined queue!`}
            </Text>
          )}
        </Grid>
        <Button auto flat color="error" onClick={closeFn} disabled={pending}>
          <Text h4>{success ? "Close" : "Cancel"}</Text>
        </Button>
        {!success && (
          <Button auto onPress={sellOrJoinQueue} disabled={pending}>
            {pending ? (
              <Loading size="sm" />
            ) : (
              <Text h4>{canSell ? "Sell" : "Join Queue"}</Text>
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
