import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	allowedDevOrigins: ["170.106.176.163", "walletgate.beeswarm.dev"],
	typescript: {
		ignoreBuildErrors: true,
	},
	serverExternalPackages: ["libsql", "@libsql/client", "@libsql/kysely-libsql"],
};

export default nextConfig;
