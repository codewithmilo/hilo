import { Card, Button, Text } from "@nextui-org/react";

export const TokenCard = (
  tokenType,
  price,
  buy,
  sell,
  shouldDisableBuy,
  shouldDisableSell
) => (
  <Card variant="bordered">
    <Card.Body css={{ textAlign: "center !important" }}>
      <Text h1>{tokenType}</Text>
      <Text h2>${price}</Text>
    </Card.Body>
    <Card.Divider />
    <Card.Footer css={{ justifyContent: "center" }}>
      <Button.Group color="gradient" size="md" ghost>
        <Button onPress={buy} disabled={shouldDisableBuy}>
          <Text h3>Buy</Text>
        </Button>
        <Button onPress={sell} disabled={shouldDisableSell}>
          <Text h3>Sell</Text>
        </Button>
      </Button.Group>
    </Card.Footer>
  </Card>
);
