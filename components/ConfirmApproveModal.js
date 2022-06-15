import { Button, Modal, Text } from "@nextui-org/react";

export const ConfirmApproveModal = (visible, setVisible, approveFn) => (
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
