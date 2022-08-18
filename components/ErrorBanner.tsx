import { Card, Text } from "@nextui-org/react";

type ErrorBannerProps = {
  error: string;
  closeFn: () => void | null;
};

export default function ErrorBanner(props: ErrorBannerProps) {
  const { error, closeFn } = props;

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
