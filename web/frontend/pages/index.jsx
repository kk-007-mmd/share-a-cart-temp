import {
  Card,
  Page,
  Layout,
  TextContainer,
  Image,
  Stack,
  Link,
  Heading,
  AccountConnection,
  CalloutCard,
  Button,
} from "@shopify/polaris";

import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { useCallback, useEffect, useState } from "react";
import { useAuthenticatedFetch } from "../hooks";

export default function HomePage() {
  const [extEnabled, setExtEnabled] = useState(false);
  const [embedBlockUrl, setEmbedBlockUrl] = useState("");
  const [extStatusFetching, setExtStatusFetching] = useState(true);
  const fetch = useAuthenticatedFetch();
  const app = useAppBridge();
  const redirect = Redirect.create(app);

  const getStatus = useCallback(async () => {
    setExtStatusFetching(true);
    try {
      const response = await fetch("/api/extension/status");
      const { data } = await response.json();
      setExtEnabled(data.status);
      setEmbedBlockUrl(data.url);
    } catch (error) {
      console.log("Error in fetching extension status", error);
    } finally {
      setExtStatusFetching(false);
    }
  }, []);

  useEffect(getStatus, []);

  return (
    <Page narrowWidth>
      <Layout>
        <Layout.Section>
          <Card title="Share A Cart Extension" sectioned>
            <p>
              Theme App Extension is Disbale in your current theme. Enable it by
              click on enable button .
            </p>
            <br />
            <Button
              primary={!extEnabled}
              loading={extStatusFetching}
              onClick={() =>
                redirect.dispatch(Redirect.Action.REMOTE, embedBlockUrl)
              }
            >
              {extEnabled ? "Disable" : "Enable"}
            </Button>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
