exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;
  if (process.env.SKIP_NOTARIZE === '1') {
    console.log('Skipping notarization (SKIP_NOTARIZE=1)');
    return;
  }

  const { notarize } = await import('@electron/notarize');
  const appName = context.packager.appInfo.productFilename;

  // Use keychain profile if available, otherwise fall back to env vars
  const useKeychain = !process.env.APPLE_ID;

  console.log(`Notarizing ${appName}.app...`);

  try {
  if (useKeychain) {
    await notarize({
      appPath: `${appOutDir}/${appName}.app`,
      keychainProfile: 'GRIP',
    });
  } else {
    await notarize({
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
  }
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }
  console.log('Notarization complete');
};
