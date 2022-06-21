import { Card, Text, Image } from "@nextui-org/react";

const renderPlayer = (account) => {
  // displays like 0x0420...6969
  const truncateAddress = (address) => {
    if (!address) return "No Account";
    const match = address.match(
      /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/
    );
    if (!match) return address;
    return `${match[1]}…${match[2]}`;
  };

  return (
    <Card
      variant="bordered"
      css={{ maxWidth: "300px", margin: "0 auto", padding: "10px" }}
    >
      <Text h4 css={{ textAlign: "center" }}>
        Player {truncateAddress(account)} connected
      </Text>
    </Card>
  );
};

const renderHoldings = (hasHi) => (
  <Card
    variant="bordered"
    css={{ maxWidth: "200px", margin: "0 auto", padding: "10px" }}
  >
    <Text h5 css={{ textAlign: "center" }}>
      You have one {hasHi ? "Hi" : "Lo"} token
    </Text>
    <Image
      alt="Hi or Lo token"
      height={40}
      src={hasHi ? "/img/hiToken.png" : "/img/loToken.png"}
    />
  </Card>
);

export { renderPlayer, renderHoldings };
