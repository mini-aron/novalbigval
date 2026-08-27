import { getClientPlatformHeader, getClientVersion } from "./clientVersion.js";

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
  const [clientVersion, clientPlatform] = await Promise.all([
    getClientVersion(),
    Promise.resolve(getClientPlatformHeader()),
  ]);

  const response = await fetch(
    `https://pd.${params.shard}.a.pvp.net/store/v3/storefront/${params.puuid}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "X-Riot-Entitlements-JWT": params.entitlementsToken,
        "X-Riot-ClientVersion": clientVersion,
        "X-Riot-ClientPlatform": clientPlatform,
        "Content-Type": "application/json",
      },
      body: "{}",
    }
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
