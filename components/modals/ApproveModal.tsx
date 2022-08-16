import { Button, Grid, Loading, Modal, Text } from "@nextui-org/react";
import { providers } from "ethers";
import { useState } from "react";
import { CONSTANTS } from "../../lib/constants";
import { approvePayments } from "../../lib/contract";
import { GetErrorMsg } from "../../lib/errors";
import { isSolidityTxnReceipt } from "../../lib/types";

type ApproveModalProps = {
  closeFn: () => void;
  provider: providers.Web3Provider;
};

export default function ApproveModal(props: ApproveModalProps) {
  const [pending, setPending] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { closeFn, provider } = props;

  const approveFn = async (provider: providers.Web3Provider) => {
    setPending(true);
    setError(null);
    const approvalOrError = await approvePayments(
      CONSTANTS.MAX_APPROVAL_AMOUNT,
      provider
    );
    if (isSolidityTxnReceipt(approvalOrError)) {
      setSuccess(true);
    } else {
      setError(GetErrorMsg(approvalOrError));
    }
    setPending(false);
  };

  return (
    <Modal
      blur
      fullScreen
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      onClose={closeFn}
      open={true}
      className="modal"
    >
      <Modal.Header>
        <Text id="modal-title" h2>
          Pre-approve payments
        </Text>
      </Modal.Header>
      <Modal.Body>
        <Text size="1.3rem">
          In order to purchase a HILO token, you must grant approval for the
          game to transfer your USDC. <br />
          Since every purchase requires this approval and the HILO token
          transfer, you must sign two transactions.
          <br />
          Pre-approval simply allows you to skip the first one by granting a
          large allowance.
        </Text>
        <br />
        <Text size="1.3rem">
          HILO will never transfer more than the price of the token at time of
          purchase.
        </Text>
        <br />
        <Text size="1.3rem">
          If you would like to wait to only approve the exact amount at
          purchase, you can simply do so when you get to it.
        </Text>
      </Modal.Body>
      <Modal.Footer css={{ borderTop: "1px solid grey" }}>
        <Grid>
          {error && (
            <Text size="1.5rem" color="error">
              {error}
            </Text>
          )}
          {pending && (
            <Text css={{ marginRight: "20px" }}>
              Approving {CONSTANTS.MAX_APPROVAL_AMOUNT} USDC...
            </Text>
          )}
          {success && <Text css={{ marginRight: "20px" }}>Approved!</Text>}
        </Grid>
        <Button auto flat color="error" onClick={closeFn} disabled={pending}>
          <Text h4>{success ? "Close" : "Cancel"}</Text>
        </Button>
        {!success && (
          <Button
            auto
            onPress={() => approveFn(provider)}
            disabled={pending || success}
          >
            {pending ? <Loading size="sm" /> : <Text h4>Approve</Text>}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
