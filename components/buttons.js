import { Button, Loading, Spacer, Card, Text } from "@nextui-org/react";
import { ConfirmApproveModal } from "./modals";

const renderRegisterButton = (account, setRegistered, loading, setLoading) => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log("Registering account...");

    const data = {
      address: e.target.address.value,
      account,
    };

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      console.log(result);
      if (result.ok) setRegistered(true);
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" id="address" />
      <Button
        type="submit"
        color="gradient"
        shadow
        bordered
        disabled={loading}
        size="xl"
        css={{
          maxWidth: "200px",
          margin: "0 auto",
        }}
      >
        {loading ? (
          <Text size="1.5rem">Registering your address...</Text>
        ) : (
          <Text size="1.5rem">Start playing!</Text>
        )}
      </Button>
      <style jsx>{`
        #address {
          position: absolute;
          top: -10000px;
        }
      `}</style>
    </form>
  );
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

export {
  renderConnectButton,
  renderRegisterButton,
  renderApproveButton,
  TokenCard,
};
