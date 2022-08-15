import { Card, Text } from "@nextui-org/react";
import { Component } from "react";
import { ErrorBannerProps } from "../lib/types";

export default class ErrorBanner extends Component<ErrorBannerProps> {
  constructor(props: ErrorBannerProps) {
    super(props);
  }

  render() {
    const { error, closeFn } = this.props;

    if (!error) return null;

    return (
      <Card
        isPressable={closeFn !== null}
        variant="bordered"
        css={{ margin: "0 auto", maxWidth: "600px" }}
        onPress={closeFn}
      >
        <Card.Body>
          <Text b color="error" size="1.3rem" css={{ textAlign: "center" }}>
            {error}
          </Text>
        </Card.Body>
      </Card>
    );
  }
}
