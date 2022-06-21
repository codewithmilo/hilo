import { Card, Loading, Text, Spacer } from "@nextui-org/react";
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

const renderTradeBanner = (action, hiPrice, loPrice, pending, success) => {
  const token =
    pending === CONSTANTS.HI_TOKEN_ID
      ? CONSTANTS.HI_TOKEN_NAME
      : CONSTANTS.LO_TOKEN_NAME;
  const price = pending === CONSTANTS.HI_TOKEN_ID ? hiPrice : loPrice;
  return (
    <Card variant="bordered">
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
          Approving{" "}
          {pendingApproveAmount == CONSTANTS.MAX_APPROVAL_AMOUNT
            ? "all USDC transactions..."
            : "this USDC transaction..."}
        </Loading>
      )}
    </Card.Body>
  </Card>
);

export {
  renderErrorBanner,
  renderWalletErrorBanner,
  renderTradeBanner,
  renderApproveBanner,
};
