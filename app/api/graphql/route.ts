import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // доор authOptions export хийх хэрэгтэй
import { typeDefs } from "./typeDefs";
import resolvers from "./resolvers";
import { startQueuePoller } from "@/lib/queuePoller";
import {ensureTemplates} from "./ensureTemplates";

const server = new ApolloServer({ typeDefs, resolvers });
let didEnsure = false;
const handler = startServerAndCreateNextHandler(server, {
  context: async () => {
    if(!didEnsure){
      didEnsure = true;
      await ensureTemplates();
    }
    const session = await getServerSession(authOptions);
    return { session };
  },
});

export async function GET(req: Request) {
  startQueuePoller();
  return handler(req);
}
export async function POST(req: Request) {
  startQueuePoller();
  return handler(req);
}
