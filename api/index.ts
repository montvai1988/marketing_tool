import "dotenv/config";
import { createApp } from "../server/app";

/** Vercel deploys this Express application as one portable serverless function. */
export default createApp();
