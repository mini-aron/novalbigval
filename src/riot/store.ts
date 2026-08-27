import { buildPdHeaders } from "./pdHeaders.js";

export interface StorefrontResult {
  skinLevelUuids: string[];
  secondsUntilReset: number;
}

interface StorefrontResponse {
  SkinsPanelLayout: {
    SingleItemOffers: string[];
    SingleItemOffersRemainingDurationInSeconds: number;
  };
}

export async function fetchStorefront(params: {
  accessToken: string;
  entitlementsToken: string;
  puuid: string;
  shard: string;
}): Promise<StorefrontResult> {
  const headers = await buildPdHeaders(params);

  const response = await fetch(
    `https://pd.${params.shard}.a.pvp.net/store/v3/storefront/${params.puuid}`,
    { method: "POST", headers, body: "{}" }
  );

  if (!response.ok) {
    throw new Error(`STOREFRONT_FAILED:${response.status}`);
  }

  const body = (await response.json()) as StorefrontResponse;
  return {
    skinLevelUuids: body.SkinsPanelLayout.SingleItemOffers,
    secondsUntilReset: body.SkinsPanelLayout.SingleItemOffersRemainingDurationInSeconds,
  };
}
