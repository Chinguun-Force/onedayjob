import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // доор authOptions export хийх хэрэгтэй
import { typeDefs } from "./typeDefs";
import resolvers from "./resolvers";
import { startQueuePoller } from "@/lib/queuePoller";


const server = new ApolloServer({ typeDefs, resolvers });
const handler = startServerAndCreateNextHandler(server, {
  context: async () => {
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
