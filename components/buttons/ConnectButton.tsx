import { Button } from "@nextui-org/react";
import { Component } from "react";
import { ConnectButtonProps } from "../../lib/types";

export default class ConnectButton extends Component<ConnectButtonProps> {
  constructor(props: ConnectButtonProps) {
    super(props);
  }

  render() {
    return (
      <Button
        color="gradient"
        size="xl"
        css={{
          maxWidth: "200px",
          margin: "0 auto",
          "& span": {
            zIndex: "auto !important",
          },
        }}
        onPress={this.props.connectFn}
      >
        Connect wallet to play
      </Button>
    );
  }
}
