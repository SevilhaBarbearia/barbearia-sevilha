type AuthSettingsResponse = {
  external?: Record<string, boolean | undefined>;
};

export async function isGoogleAuthEnabled() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return false;
  }

  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/auth/v1/settings`,
      {
        headers: {
          apikey: anonKey,
        },
        next: {
          revalidate: 300,
        },
      },
    );

    if (!response.ok) {
      return false;
    }

    const settings =
      (await response.json()) as AuthSettingsResponse;

    return settings.external?.google === true;
  } catch {
    return false;
  }
}
