import { NextApiRequest, NextApiResponse } from "next";

// /api/tokens/{id}
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const tid = parseInt(id as string);
  let metadata: { name: string; description: string; image: string };

  switch (tid) {
    case 0:
      metadata = {
        name: "HI",
        description: "The Hi token",
        image:
          "ipfs://bafkreihguk3zwpsyw44hkbdbkug2bxqr5wnajvb45gquhsee6tasax2fk4",
      };
      break;
    case 1:
      metadata = {
        name: "LO",
        description: "The Lo token",
        image:
          "ipfs://bafkreiexyrbmtvcbm4lktx2p2ktsog72txfwkdz3i6mmvoenxgjj6hwdlu",
      };
      break;

    default:
      metadata = { name: "", description: "", image: "" };
      break;
  }

  res.status(200).json(metadata);
}
