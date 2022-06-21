const POLYGON_CHAIN_ID = 137;
const MUMBAI_CHAIN_ID = 80001;

const POLYGON_CHAIN = "polygon";
const MUMBAI_CHAIN = "mumbai";

const INITIAL_HI = 5;
const INITIAL_LO = 1;

const CONSTANTS = {
  HI_TOKEN_ID: 0,
  LO_TOKEN_ID: 1,
  HI_TOKEN_NAME: "Hi",
  LO_TOKEN_NAME: "Lo",

  CHAIN_ID: MUMBAI_CHAIN_ID,

  CHAIN_NAME: MUMBAI_CHAIN,

  // Enough to never pay approval fees again, for pre-approval
  // Follow the sum of integers formula: n * (h + l) / 2
  MAX_APPROVAL_AMOUNT: (INITIAL_HI * (INITIAL_HI + INITIAL_LO)) / 2,

  HILO_CONTRACT_ADDRESS: "0x3EA7357f5E51E153651e629c08B8c576dF84a001",

  USDC_ADDRESS: "0xe11A86849d99F524cAC3E7A0Ec1241828e332C62",
};

export { CONSTANTS };