const POLYGON_CHAIN_ID = 137;
const MUMBAI_CHAIN_ID = 80001;

const POLYGON_CHAIN = "polygon";
const MUMBAI_CHAIN = "mumbai";

const POLYSCAN_URL = "https://polygonscan.com/address/";
const MUMBAI_POLYSCAN_URL = "https://mumbai.polygonscan.com/address/";

const INITIAL_HI = 50;
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

  HILO_CONTRACT_ADDRESS: "0x61E92D349284c5E39BF4e9407aE3d68436ffF7bc",

  USDC_ADDRESS: "0xe11A86849d99F524cAC3E7A0Ec1241828e332C62",

  POLYSCAN_BASE_URL: MUMBAI_POLYSCAN_URL,
};

export { CONSTANTS };
