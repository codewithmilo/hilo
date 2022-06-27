import { Card, Loading, Text, Spacer, Button, Grid } from "@nextui-org/react";
import { CONSTANTS } from "../lib/constants";

const renderErrorBanner = (error, setError) => (
  <Card
    isPressable
    variant="flat"
    css={{
      backgroundColor: "#910838",
      padding: "10px",
    }}
    onClick={() => setError(null)}
  >
    <Text b color="white" size="1.3rem" css={{ textAlign: "center" }}>
      {error}
    </Text>
  </Card>
);

const renderWalletErrorBanner = (wallet, error, setError) => (
  <>
    <Spacer y={2} />
    <Card
      isPressable={!wallet}
      variant="bordered"
      css={{ margin: "0 auto", maxWidth: "600px" }}
      onPress={() => setError(null)}
    >
      <Card.Body>
        <Text b color="error" size="1.3rem" css={{ textAlign: "center" }}>
          {error}
        </Text>
      </Card.Body>
    </Card>
  </>
);

const renderTradeBanner = (
  action,
  hiPrice,
  loPrice,
  pending,
  setPending,
  success,
  setSuccess
) => {
  const token =
    pending === CONSTANTS.HI_TOKEN_ID
      ? CONSTANTS.HI_TOKEN_NAME
      : CONSTANTS.LO_TOKEN_NAME;
  const price = pending === CONSTANTS.HI_TOKEN_ID ? hiPrice : loPrice;

  return (
    <Card
      variant="bordered"
      isPressable
      onPress={() => {
        setSuccess(false);
        setPending(null);
      }}
    >
      <Card.Body>
        {success ? (
          <Text b color="white" size="lg" css={{ textAlign: "center" }}>
            You just {action === "buy" ? "bought" : "sold"} a {token} token!
          </Text>
        ) : (
          <Loading type="points-opacity" color="secondary" size="lg">
            {action === "buy" ? "Buying" : "Selling"} a {token} token for $
            {price}...
          </Loading>
        )}
      </Card.Body>
    </Card>
  );
};

const renderApproveBanner = (
  approvalSuccess,
  pendingApproveAmount,
  setApprovalSuccess
) => (
  <Card
    variant="bordered"
    isPressable={approvalSuccess}
    onPress={() => setApprovalSuccess(false)}
  >
    <Card.Body>
      {approvalSuccess ? (
        <Text b color="white" size="1.2rem" css={{ textAlign: "center" }}>
          Successfully approved!
        </Text>
      ) : (
        <Loading type="points-opacity" color="secondary" size="lg">
          Granting approval for{" "}
          {pendingApproveAmount == CONSTANTS.MAX_APPROVAL_AMOUNT
            ? "USDC transfers..."
            : "this transaction..."}
        </Loading>
      )}
    </Card.Body>
  </Card>
);

const renderPriceUpdatedBanner = (tokenId, setShowBanner) => {
  const token = tokenId === CONSTANTS.HI_TOKEN_ID ? "Hi" : "Lo";
  const changeStr =
    tokenId === CONSTANTS.HI_TOKEN_ID ? "decreased" : "increased";

  return (
    <Card variant="bordered" isPressable onPress={() => setShowBanner(null)}>
      <Card.Body>
        <Text b color="white" size="1.2rem" css={{ textAlign: "center" }}>
          The {token} token price has {changeStr}!
        </Text>
      </Card.Body>
    </Card>
  );
};

const renderSalesLockedBanner = (add, loading, success, inlineCount, close) => {
  let countStr;
  if (success) {
    if (inlineCount === 0) {
      countStr = "As soon as selling unlocks, your token will be sold.";
    } else {
      countStr = "There are " + inlineCount;
      countStr +=
        (inlineCount === 1 ? " player" : " players") + " ahead of you.";
    }
  }

  return (
    <Card variant="bordered" css={{ margin: "0 auto" }}>
      <Card.Body>
        {success && (
          <Text b size="1.3rem" css={{ textAlign: "center" }}>
            You have been added to the sale queue! {countStr}
          </Text>
        )}
        {loading && (
          <Loading type="points-opacity" color="secondary" size="lg">
            Adding you to the sale queue...
          </Loading>
        )}
        {!success && !loading && (
          <>
            <Text b size="1.3rem" css={{ textAlign: "center" }}>
              Sales are currently locked at this price. <br />
              You can allow HILO to sell for you at the next opportunity by
              entering the sale queue.
            </Text>
            <Spacer y={1} />
            <Grid.Container justify="space-evenly">
              <Button onPress={close} color="error" css={{ maxWidth: "200px" }}>
                Cancel
              </Button>
              <Button
                onPress={add}
                color="gradient"
                css={{ maxWidth: "200px" }}
              >
                Enter Queue
              </Button>
            </Grid.Container>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export {
  renderErrorBanner,
  renderWalletErrorBanner,
  renderTradeBanner,
  renderApproveBanner,
  renderPriceUpdatedBanner,
  renderSalesLockedBanner,
};
