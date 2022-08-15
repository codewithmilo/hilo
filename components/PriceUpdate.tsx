import { Card, Text } from "@nextui-org/react";
import { Component } from "react";
import CONSTANTS from "../lib/constants";
import { PriceUpdateProps } from "../lib/types";

export default class PriceUpdate extends Component<PriceUpdateProps> {
  constructor(props: PriceUpdateProps) {
    super(props);
  }

  render() {
    const tokenStr = this.props.token === CONSTANTS.HI_TOKEN_ID ? "Hi" : "Lo";
    const changeStr =
      this.props.token === CONSTANTS.HI_TOKEN_ID ? "decreased" : "increased";

    return (
      <Card variant="bordered" isPressable onPress={this.props.closeFn}>
        <Card.Body>
          <Text b color="white" size="1.2rem" css={{ textAlign: "center" }}>
            The {tokenStr} token price has {changeStr}!
          </Text>
        </Card.Body>
      </Card>
    );
  }
}
