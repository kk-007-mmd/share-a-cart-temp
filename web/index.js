// @ts-check
import dotenv from "dotenv";
dotenv.config();
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import GDPRWebhookHandlers from "./gdpr.js";
import axios from "axios";
import cors from "cors";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "8081",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

app.use(cors());

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  // @ts-ignore
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

app.post("/api/cart", express.json(), async (req, res) => {
  try {
    const { cart } = req.body;

    console.log("cart", cart);

    const { data } = await axios.post(
      "https://share-a-cart.com/api/make/saveWithMetadata",
      cart
    );
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/cart", express.json(), async (req, res) => {
  try {
    const { cartId } = req.query;
    console.log(cartId, "cartId");

    const { data } = await axios.get(
      `https://share-a-cart.com/api/get/${cartId}`
    );
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// All endpoints after this point will require an active session
app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

app.get("/api/extension/status", async (_req, res) => {
  let status = 200;
  let error = null;
  let data = {};

  try {
    const template = "cart";
    const uuid = "0f2796df-b0ad-4608-bdc3-4ccfab63d762";
    const handle = "share-a-cart";

    const session = res.locals.shopify.session;
    const themes = await shopify.api.rest.Theme.all({
      session: session,
    });
    const theme = themes.find((theme) => theme.role === "main") || themes[0];
    const settings = await shopify.api.rest.Asset.all({
      session: session,
      theme_id: theme.id,
      asset: { key: "config/settings_data.json" },
    });

    const setting = JSON.parse(settings[0].value);

    const status = Object.values(setting?.current?.blocks || {}).find((e) =>
      e.type.includes("share-a-cart")
    ).disabled;
    data = {
      status: !status,
      url: `https://${session.shop}/admin/themes/current/editor?context=apps&template=${template}&activateAppId=${uuid}/${handle}`,
    };
  } catch (e) {
    console.log(`Failed to process extension/status: ${e.message}`);
    status = 500;
    error = e.message;
  }
  const _success = status === 200;
  res.status(status).send({
    success: _success,
    ...(_success ? { data } : { error }),
  });
});

app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT, () => console.log(`Server Listening on ${PORT}`));
