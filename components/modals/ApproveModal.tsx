import { Button, Modal, Text } from "@nextui-org/react";
import { Component } from "react";

type ApproveModalProps = {
  closeFn: () => void;
};

const approveFn = () => {
  console.log("approve");
};

export default class ApproveModal extends Component<ApproveModalProps> {
  constructor(props: ApproveModalProps) {
    super(props);
  }

  render() {
    return (
      <Modal
        blur
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        onClose={this.props.closeFn}
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
        <Modal.Footer>
          <Button auto flat color="error" onClick={this.props.closeFn}>
            <Text h4>Cancel</Text>
          </Button>
          <Button auto onClick={approveFn}>
            <Text h4>Approve</Text>
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
