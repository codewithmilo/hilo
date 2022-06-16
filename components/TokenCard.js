import { Card, Button, Text, Loading } from "@nextui-org/react";

export const TokenCard = (
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
        <Button onPress={() => buy(tokenId)} disabled={shouldDisableBuy}>
          {buyIsLoading ? (
            <Loading type="points-opacity" size="xl" />
          ) : (
            <Text h3>Buy</Text>
          )}
        </Button>
        <Button onPress={() => sell(tokenId)} disabled={shouldDisableSell}>
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
