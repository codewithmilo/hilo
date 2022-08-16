import { Button, Card, Text } from "@nextui-org/react";
import { Component } from "react";
import { Tokens, tokenString } from "../lib/types";

type TokenCardProps = {
  tokenType: Tokens;
  price: number;
  buyFn: () => void;
  sellFn: () => void;
};

export default class TokenCard extends Component<TokenCardProps> {
  constructor(props: TokenCardProps) {
    super(props);
  }

  render() {
    const { tokenType, price, buyFn, sellFn } = this.props;

    return (
      <Card variant="bordered">
        <Card.Body css={{ textAlign: "center !important" }}>
          <Text h1>{tokenString(tokenType)}</Text>
          <Text h2>${price}</Text>
        </Card.Body>
        <Card.Divider />
        <Card.Footer css={{ justifyContent: "center" }}>
          <Button.Group color="gradient" size="md" ghost>
            <Button onPress={buyFn}>
              <Text h3>Buy</Text>
            </Button>
            <Button onPress={sellFn}>
              <Text h3>Sell</Text>
            </Button>
          </Button.Group>
        </Card.Footer>
      </Card>
    );
  }
}
