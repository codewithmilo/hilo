import { Button, Modal, Text } from "@nextui-org/react";

const ConfirmApproveModal = (visible, setVisible, approveFn) => (
  <Modal
    blur
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
    onClose={() => setVisible(false)}
    open={visible}
  >
    <Modal.Header>
      <Text id="modal-title" h2>
        Pre-approve payments
      </Text>
    </Modal.Header>
    <Modal.Body>
      <Text id="modal-description" size="1.3rem">
        This will ask you to approve payments up to $1000 but you will only ever
        be charged the shown price at the time of purchase. You will not need to
        approve payments again.
      </Text>
      <br />
      <Text size="1.3rem">
        If you would like to wait to approve the exact amount at purchase, you
        can simply do so when you get to it.
      </Text>
    </Modal.Body>
    <Modal.Footer>
      <Button auto flat color="error" onClick={() => setVisible(false)}>
        <Text h4>Cancel</Text>
      </Button>
      <Button auto onClick={approveFn}>
        <Text h4>Approve</Text>
      </Button>
    </Modal.Footer>
  </Modal>
);

const HowToPlayModal = (visible, setVisible) => {
  if (visible) {
    return (
      <Modal
        blur
        closeButton
        onClose={() => setVisible(false)}
        open={visible}
        className="modal"
      >
        <Modal.Header>
          <Text h1>How to Play</Text>
        </Modal.Header>
        <Modal.Body>
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
          <Text size="1.5rem">
            Sell back a <b>Lo</b> to get a profit after the price has increased
            <br />
            Sell back a <b>Hi</b> to get a free <b>Lo</b> token
          </Text>
          <br />
          <Text size="1.5rem">
            When the prices converge—a <b>Hi</b> and <b>Lo</b> are both sold for
            the same price—<b>the game is over</b>
            <br />
            The two winners who sold split the jackpot of <b>$100,000</b>
            <br />
          </Text>
          <br />
          <Text size="1.5rem" css={{ textAlign: "center" }}>
            Good luck!
          </Text>
        </Modal.Body>
      </Modal>
    );
  } else {
    return null;
  }
};

export { ConfirmApproveModal, HowToPlayModal };