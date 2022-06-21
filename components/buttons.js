import { Button, Loading, Spacer, Card, Text } from "@nextui-org/react";
import { ConfirmApproveModal } from "./modals";

const renderConnectButton = (wallet, connectWallet) => {
  if (wallet) {
    return null;
  } else {
    return (
      <Button
        color="gradient"
        size="xl"
        css={{
          maxWidth: "200px",
          margin: "0 auto",
        }}
        onPress={connectWallet}
      >
        Connect wallet to play
      </Button>
    );
  }
};

const renderApproveButton = (
  approveButtonLoading,
  approveModalVisible,
  setApproveModalVisible,
  preApprovePayments
) => (
  <>
    <Button
      color="gradient"
      size="lg"
      css={{ maxWidth: "200px", margin: "0 auto" }}
      onPress={() => setApproveModalVisible(true)}
      disabled={approveButtonLoading}
    >
      {approveButtonLoading ? (
        <Loading type="points-opacity" color="currentColor" size="lg" />
      ) : (
        "Pre-approve payments"
      )}
    </Button>
    <Spacer y={1} />
    {ConfirmApproveModal(
      approveModalVisible,
      setApproveModalVisible,
      preApprovePayments
    )}
  </>
);

const TokenCard = (
  tokenType,
  tokenId,
  price,
  buy,
  sell,
  shouldDisableBuy,
  shouldDisableSell,
  buyIsLoading,
  sellIsLoading
) => (
  <Card variant="bordered">
    <Card.Body css={{ textAlign: "center !important" }}>
      <Text h1>{tokenType}</Text>
      <Text h2>${price}</Text>
    </Card.Body>
    <Card.Divider />
    <Card.Footer css={{ justifyContent: "center" }}>
      <Button.Group color="gradient" size="md" ghost>
        <Button
          onPress={() => buy(tokenId)}
          disabled={shouldDisableBuy || buyIsLoading || sellIsLoading}
        >
          {buyIsLoading ? (
            <Loading type="points-opacity" size="xl" />
          ) : (
            <Text h3>Buy</Text>
          )}
        </Button>
        <Button
          onPress={() => sell(tokenId)}
          disabled={shouldDisableSell || sellIsLoading || buyIsLoading}
        >
          {sellIsLoading ? (
            <Loading type="points-opacity" size="xl" />
          ) : (
            <Text h3>Sell</Text>
          )}
        </Button>
      </Button.Group>
    </Card.Footer>
  </Card>
);

export { renderConnectButton, renderApproveButton, TokenCard };
