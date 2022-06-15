import { Modal, Text } from "@nextui-org/react";

export const HowToPlayModal = (visible, setVisible) => {
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
